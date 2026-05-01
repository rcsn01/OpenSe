// @ts-ignore Deno edge runtime resolves remote module at deploy/runtime.
import Stripe from 'https://esm.sh/stripe@18.4.0?target=deno'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { parseAllowedRedirectUrl, parseAppCode, parseSeatLimit } from '../_shared/request-validation.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })

const parseBody = async (req: Request): Promise<Record<string, unknown>> => {
  try {
    return (await req.json()) as Record<string, unknown>
  } catch {
    return {}
  }
}

const getCurrentUser = async (supabaseUrl: string, supabaseAnonKey: string, authHeader: string) => {
  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authHeader,
    },
  })

  const user = await userRes.json().catch(() => null)
  if (!userRes.ok || !user?.id) {
    throw new Error('Unauthorized')
  }

  return user as { id: string; email?: string }
}

const rpc = async (
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
  rpcName: string,
  body: Record<string, unknown> = {},
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: authHeader,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? `RPC ${rpcName} failed`)
  }

  return data
}

const serviceUpdateOrgStripe = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  orgId: string,
  stripeCustomerId: string,
  stripeSubscriptionId: string,
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/organisations?id=eq.${orgId}`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      Prefer: 'return=minimal',
    },
    body: JSON.stringify({
      stripe_customer_id: stripeCustomerId,
      stripe_subscription_id: stripeSubscriptionId,
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(body || 'Failed to persist Stripe customer/subscription IDs')
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req)
  }

  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(req, 500, { error: 'Supabase environment is not configured' })
  }

  if (!stripeSecretKey) {
    return json(req, 500, { error: 'STRIPE_SECRET_KEY is not configured' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(req, 401, { error: 'Missing authorization header' })
  }

  try {
    const currentUser = await getCurrentUser(supabaseUrl, supabaseAnonKey, authHeader)

    const body = await parseBody(req)
    const appCode = parseAppCode(body.appCode)
    const seatLimit = parseSeatLimit(body.seatLimit, body.tier, { allowDefaultZero: true })
    const successUrl = parseAllowedRedirectUrl(body.successUrl, 'successUrl')
    const cancelUrl = parseAllowedRedirectUrl(body.cancelUrl, 'cancelUrl')
    const requestedOrgId = typeof body.orgId === 'string' ? body.orgId : null
    const requestedOrgName = typeof body.orgName === 'string' ? body.orgName.trim() : ''

    let metadata: Record<string, string> = {
      app_code: appCode,
      seat_limit: String(seatLimit),
      user_id: currentUser.id,
      mode: 'org_billing',
    }

    let customerName = requestedOrgName || currentUser.email || 'OpenSe Organisation'
    let existingCustomerId: string | null = null

    if (requestedOrgId) {
      metadata = {
        ...metadata,
        org_id: requestedOrgId,
      }

      const contextRows = await rpc(supabaseUrl, supabaseAnonKey, authHeader, 'accounts_get_my_org_context')
      const context = Array.isArray(contextRows) ? contextRows[0] : null

      if (!context?.org_id || context.org_id !== requestedOrgId) {
        return json(req, 403, { error: 'Org context mismatch for checkout' })
      }

      if (context.member_role !== 'owner') {
        return json(req, 403, { error: 'Only organisation owners can manage subscription checkout' })
      }

      customerName = context.org_name
      existingCustomerId = context.stripe_customer_id ?? null
    } else if (requestedOrgName) {
      metadata = {
        ...metadata,
        org_name: requestedOrgName,
        mode: 'create_org_checkout',
      }
    }

    const stripe = new Stripe(stripeSecretKey)

    const customer = existingCustomerId
      ? await stripe.customers.retrieve(existingCustomerId)
      : await stripe.customers.create({
          email: currentUser.email,
          name: customerName,
          metadata,
        })

    const customerId = typeof customer === 'string' ? customer : customer.id

    const session = await stripe.checkout.sessions.create({
      mode: 'subscription',
      customer: customerId,
      line_items: [
        {
          price_data: {
            currency: 'usd',
            product_data: {
              name: `${appCode.toUpperCase()} seats`,
            },
            recurring: {
              interval: 'month',
            },
            unit_amount: 1000,
          },
          quantity: Math.max(seatLimit, 1),
        },
      ],
      success_url: successUrl,
      cancel_url: cancelUrl,
      metadata,
      subscription_data: {
        metadata,
      },
    })

    if (requestedOrgId && session.subscription && typeof session.subscription === 'string') {
      await serviceUpdateOrgStripe(supabaseUrl, serviceRoleKey, requestedOrgId, customerId, session.subscription)
    }

    return json(req, 200, {
      url: session.url,
      checkoutId: session.id,
      orgId: requestedOrgId,
      appCode,
      seatLimit,
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : 400
    return json(req, status, { error: message })
  }
})
