declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

const DEFAULT_ALLOWED_ORIGINS = [
  'http://localhost:5990',
  'http://localhost:5991',
  'http://localhost:5992',
  'http://localhost:5993',
  'http://localhost:5994',
  'http://localhost:5999',
]

const parseOrigins = (value: string | undefined) =>
  (value ?? '')
    .split(',')
    .map((origin) => origin.trim())
    .filter(Boolean)

const getAllowedOrigins = () =>
  new Set([
    ...DEFAULT_ALLOWED_ORIGINS,
    ...parseOrigins(Deno.env.get('EDGE_ALLOWED_ORIGINS')),
    ...parseOrigins(Deno.env.get('ALLOWED_ORIGINS')),
  ])

export const getCorsHeaders = (req: Request): Record<string, string> => {
  const origin = req.headers.get('Origin')
  const headers: Record<string, string> = {
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
    'Access-Control-Allow-Methods': 'POST, OPTIONS',
    Vary: 'Origin',
  }

  if (origin && getAllowedOrigins().has(origin)) {
    headers['Access-Control-Allow-Origin'] = origin
  }

  return headers
}

export const handleCorsPreflight = (req: Request) => {
  const origin = req.headers.get('Origin')
  if (origin && !getAllowedOrigins().has(origin)) {
    return new Response('CORS origin not allowed', { status: 403, headers: { Vary: 'Origin' } })
  }

  return new Response('ok', { headers: getCorsHeaders(req) })
}
