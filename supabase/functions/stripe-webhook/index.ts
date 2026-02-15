// @ts-ignore Deno edge runtime resolves remote module at deploy/runtime.
import Stripe from 'https://esm.sh/stripe@18.4.0?target=deno'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })

const patchOrgAppSeatLimit = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  orgId: string,
  appCode: string,
  seatLimit: number,
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/organisation_app_seats?org_id=eq.${orgId}&app_code=eq.${appCode}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({ seat_limit: seatLimit }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || 'Failed to update organisation app seat limit')
  }
}

const createOrganisationForCheckout = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  ownerUserId: string,
  orgName: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/organisations`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify([
      {
        name: orgName,
        owner_id: ownerUserId,
        stripe_customer_id: stripeCustomerId,
        stripe_subscription_id: stripeSubscriptionId,
      },
    ]),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || 'Failed to create organisation from checkout')
  }

  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) ? rows[0] : null
}

const updateOrgBySubscription = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  subscriptionId: string,
  updates: Record<string, unknown>,
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/organisations?stripe_subscription_id=eq.${subscriptionId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=representation',
    },
    body: JSON.stringify(updates),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || 'Failed to update organisation from webhook')
  }

  const rows = await response.json().catch(() => [])
  return Array.isArray(rows) ? rows[0] : null
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')
  const stripeWebhookSecret = Deno.env.get('STRIPE_WEBHOOK_SECRET')

  if (!supabaseUrl || !serviceRoleKey || !stripeSecretKey || !stripeWebhookSecret) {
    return json(500, { error: 'Webhook environment is not configured' })
  }

  const signature = req.headers.get('stripe-signature')
  if (!signature) {
    return json(400, { error: 'Missing stripe-signature header' })
  }

  const rawBody = await req.text()

  try {
    const stripe = new Stripe(stripeSecretKey)
    const event = await stripe.webhooks.constructEventAsync(rawBody, signature, stripeWebhookSecret)

    if (event.type === 'checkout.session.completed') {
      const session = event.data.object as Stripe.Checkout.Session
      let orgId = session.metadata?.org_id
      const appCode = session.metadata?.app_code
      const seatLimit = Number(session.metadata?.seat_limit ?? 0)
      const mode = session.metadata?.mode

      if (!orgId && mode === 'create_org_checkout' && session.customer && session.subscription) {
        const createdOrg = await createOrganisationForCheckout(
          supabaseUrl,
          serviceRoleKey,
          String(session.metadata?.user_id ?? ''),
          String(session.metadata?.org_name ?? 'OpenSe Organisation'),
          String(session.customer),
          String(session.subscription),
        )
        orgId = createdOrg?.id
      }

      if (orgId && session.customer && session.subscription) {
        await fetch(`${supabaseUrl}/rest/v1/organisations?id=eq.${orgId}`, {
          method: 'PATCH',
          headers: {
            'Content-Type': 'application/json',
            apikey: serviceRoleKey,
            Authorization: `Bearer ${serviceRoleKey}`,
            Prefer: 'return=minimal',
          },
          body: JSON.stringify({
            stripe_customer_id: String(session.customer),
            stripe_subscription_id: String(session.subscription),
          }),
        })
      }

      if (orgId && appCode && Number.isInteger(seatLimit) && seatLimit >= 0) {
        await patchOrgAppSeatLimit(supabaseUrl, serviceRoleKey, orgId, appCode, seatLimit)
      }
    }

    if (event.type === 'customer.subscription.updated' || event.type === 'customer.subscription.created') {
      const subscription = event.data.object as Stripe.Subscription
      const org = await updateOrgBySubscription(
        supabaseUrl,
        serviceRoleKey,
        subscription.id,
        {
          stripe_customer_id: String(subscription.customer),
          stripe_subscription_id: subscription.id,
        },
      )

      const appCode = subscription.metadata?.app_code
      const seatLimit = Number(subscription.metadata?.seat_limit ?? 0)

      if (org?.id && appCode && Number.isInteger(seatLimit) && seatLimit >= 0) {
        await patchOrgAppSeatLimit(supabaseUrl, serviceRoleKey, org.id, appCode, seatLimit)
      }
    }

    if (event.type === 'customer.subscription.deleted') {
      const subscription = event.data.object as Stripe.Subscription
      await updateOrgBySubscription(supabaseUrl, serviceRoleKey, subscription.id, {
        stripe_subscription_id: null,
      })
    }

    return json(200, { received: true })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown webhook error'
    return json(400, { error: message })
  }
})
