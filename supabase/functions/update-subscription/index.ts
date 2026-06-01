// @ts-ignore Deno edge runtime resolves remote module at deploy/runtime.
import Stripe from 'https://esm.sh/stripe@18.4.0?target=deno'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { parseAppCode, parseSeatLimit } from '../_shared/request-validation.ts'

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

const restGet = async (
  supabaseUrl: string,
  anonKey: string,
  authHeader: string,
  path: string,
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    method: 'GET',
    headers: {
      apikey: anonKey,
      Authorization: authHeader,
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? `REST ${path} failed`)
  }

  return data
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
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
    return json(req, 500, { error: 'Supabase environment is not configured' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(req, 401, { error: 'Missing authorization header' })
  }

  try {
    const body = await parseBody(req)

    const appCode = parseAppCode(body.appCode)
    const seatLimit = parseSeatLimit(body.seatLimit, body.tier)

    const contextRows = await restGet(
      supabaseUrl,
      supabaseAnonKey,
      authHeader,
      'account_org_context?select=org_id,org_name,member_role,stripe_customer_id,stripe_subscription_id&order=member_created_at.asc&limit=1',
    )
    const context = Array.isArray(contextRows) ? contextRows[0] : null

    if (!context?.org_id) {
      return json(req, 404, { error: 'Organisation context not found' })
    }

    if (context.member_role !== 'owner' && context.member_role !== 'admin') {
      return json(req, 403, { error: 'Only organisation owners and admins can update billing limits' })
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

    return json(req, 200, {
      success: true,
      orgId: context.org_id,
      appCode,
      seatLimit,
      message: 'Subscription metadata and seat limit synchronized',
    })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json(req, 400, { error: message })
  }
})
