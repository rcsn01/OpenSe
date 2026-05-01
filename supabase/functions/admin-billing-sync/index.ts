// @ts-ignore Deno edge runtime resolves remote module at deploy/runtime.
import Stripe from 'https://esm.sh/stripe@18.4.0?target=deno'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

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

const ensureSuperAdmin = async (supabaseUrl: string, anonKey: string, authHeader: string) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/get_super_admin_status`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: anonKey,
      Authorization: authHeader,
    },
    body: JSON.stringify({}),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok || data !== true) {
    throw new Error('Access denied: Super Admin only')
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
  const stripeSecretKey = Deno.env.get('STRIPE_SECRET_KEY')

  if (!supabaseUrl || !supabaseAnonKey) {
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
    await ensureSuperAdmin(supabaseUrl, supabaseAnonKey, authHeader)

    const body = await parseBody(req)
    const action = String(body.action ?? '')
    const stripe = new Stripe(stripeSecretKey)

    if (action === 'sync_coupon') {
      const code = String(body.code ?? '').trim().toUpperCase()
      const discountPercent = Number(body.discountPercent)

      if (!code || Number.isNaN(discountPercent) || discountPercent <= 0 || discountPercent > 100) {
        return json(req, 400, { error: 'Invalid coupon payload' })
      }

      const coupon = await stripe.coupons.create({
        name: code,
        percent_off: discountPercent,
        duration: 'once',
      })

      return json(req, 200, {
        success: true,
        stripeCouponId: coupon.id,
      })
    }

    if (action === 'sync_pricing_plan') {
      const productName = String(body.productName ?? '').trim()
      const seatPriceCents = Number(body.seatPriceCents)
      const existingProductId = typeof body.existingProductId === 'string' ? body.existingProductId : null

      if (!productName || Number.isNaN(seatPriceCents) || seatPriceCents < 0) {
        return json(req, 400, { error: 'Invalid pricing payload' })
      }

      const product = existingProductId
        ? await stripe.products.retrieve(existingProductId)
        : await stripe.products.create({
            name: productName,
          })

      const productId = typeof product === 'string' ? product : product.id

      const price = await stripe.prices.create({
        currency: 'usd',
        unit_amount: seatPriceCents,
        recurring: { interval: 'month' },
        product: productId,
      })

      return json(req, 200, {
        success: true,
        stripeProductId: productId,
        stripePriceId: price.id,
      })
    }

    return json(req, 400, { error: 'Unsupported action' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json(req, 400, { error: message })
  }
})
