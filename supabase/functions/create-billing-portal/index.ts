// @ts-ignore Deno edge runtime resolves remote module at deploy/runtime.
import Stripe from 'https://esm.sh/stripe@18.4.0?target=deno'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { parseAllowedRedirectUrl } from '../_shared/request-validation.ts'

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

  if (!supabaseUrl || !supabaseAnonKey || !stripeSecretKey) {
    return json(req, 500, { error: 'Supabase or Stripe environment is not configured' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(req, 401, { error: 'Missing authorization header' })
  }

  try {
    const body = await parseBody(req)
    const returnUrl = parseAllowedRedirectUrl(body.returnUrl, 'returnUrl')
    const contextRows = await rpc(supabaseUrl, supabaseAnonKey, authHeader, 'accounts_get_my_org_context')
    const context = Array.isArray(contextRows) ? contextRows[0] : null

    if (!context?.org_id) {
      return json(req, 404, { error: 'Organisation context not found' })
    }

    if (context.member_role !== 'owner' && context.member_role !== 'admin') {
      return json(req, 403, { error: 'Only organisation owners and admins can access the billing portal' })
    }

    if (!context.stripe_customer_id) {
      return json(req, 400, { error: 'Stripe customer is not linked for this organisation' })
    }

    const stripe = new Stripe(stripeSecretKey)
    const session = await stripe.billingPortal.sessions.create({
      customer: context.stripe_customer_id,
      return_url: returnUrl,
    })

    return json(req, 200, { url: session.url })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json(req, 400, { error: message })
  }
})
