// @ts-ignore Deno edge runtime resolves remote module at deploy/runtime.
import Stripe from 'https://esm.sh/stripe@18.4.0?target=deno'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...corsHeaders,
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

const parseSubscriptionSeatLimit = (tier: string | null | undefined): number => {
  if (tier === 'tier-1') return 5
  if (tier === 'tier-2') return 15
  if (tier === 'tier-3') return 50
  return 0
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(500, { error: 'Supabase environment is not configured' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(401, { error: 'Missing authorization header' })
  }

  try {
    const body = await parseBody(req)

    const appCode = typeof body.appCode === 'string' ? body.appCode : 'etl'
    const explicitSeatLimit = Number(body.seatLimit)
    const tierSeatLimit = typeof body.tier === 'string' ? parseSubscriptionSeatLimit(body.tier) : null
    const seatLimitCandidate = Number.isInteger(explicitSeatLimit) && explicitSeatLimit >= 0
      ? explicitSeatLimit
      : tierSeatLimit

    const seatLimit = seatLimitCandidate ?? -1

    if (!['etl', 'stoqr'].includes(appCode)) {
      return json(400, { error: 'appCode must be etl or stoqr' })
    }

    if (!Number.isInteger(seatLimit) || seatLimit < 0) {
      return json(400, { error: 'seatLimit must be provided as non-negative integer or tier' })
    }

    const contextRows = await rpc(supabaseUrl, supabaseAnonKey, authHeader, 'accounts_get_my_org_context')
    const context = Array.isArray(contextRows) ? contextRows[0] : null

    if (!context?.org_id) {
      return json(404, { error: 'Organisation context not found' })
    }

    if (context.member_role !== 'owner') {
      return json(403, { error: 'Only organisation owners can update billing limits' })
    }

    if (stripeSecretKey && context.stripe_subscription_id) {
      try {
        const stripe = new Stripe(stripeSecretKey)
        await stripe.subscriptions.update(context.stripe_subscription_id, {
          metadata: {
            org_id: context.org_id,
            app_code: appCode,
            seat_limit: String(seatLimit),
          },
        })
      } catch {
      }
    }

    await rpc(supabaseUrl, supabaseAnonKey, authHeader, 'accounts_update_org_seat_limit', {
      p_app_code: appCode,
      p_seat_limit: seatLimit,
    })

    return json(200, {
      success: true,
      orgId: context.org_id,
      appCode,
      seatLimit,
      message: 'Subscription metadata and seat limit synchronized',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json(400, { error: message })
  }
})
