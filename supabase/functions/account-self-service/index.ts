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

const getCurrentUser = async (supabaseUrl: string, supabaseAnonKey: string, authHeader: string) => {
  const response = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: {
      apikey: supabaseAnonKey,
      Authorization: authHeader,
    },
  })

  const user = await response.json().catch(() => null)
  if (!response.ok || !user?.id) {
    throw new Error('Unauthorized')
  }

  return user as Record<string, unknown> & { id: string; email?: string }
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

const serviceFetch = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  options: RequestInit = {},
) => {
  const response = await fetch(`${supabaseUrl}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(options.headers ?? {}),
    },
  })

  const text = await response.text()
  const data = text ? JSON.parse(text) : null
  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? text || 'Service request failed')
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
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(req, 500, { error: 'Supabase environment is not configured' })
  }

  const authHeader = req.headers.get('Authorization')
  if (!authHeader) {
    return json(req, 401, { error: 'Missing authorization header' })
  }

  try {
    const user = await getCurrentUser(supabaseUrl, supabaseAnonKey, authHeader)
    const body = await parseBody(req)
    const action = typeof body.action === 'string' ? body.action : ''

    if (action === 'export-account') {
      const [profile, preferences, orgContext, assignments, auditEvents] = await Promise.all([
        restGet(
          supabaseUrl,
          supabaseAnonKey,
          authHeader,
          `profiles?select=id,email,full_name,username,avatar_url,avatar_storage_path,recovery_email,created_at,updated_at&id=eq.${user.id}`,
        ).catch(() => []),
        restGet(
          supabaseUrl,
          supabaseAnonKey,
          authHeader,
          `account_preferences?select=theme,timezone,locale,notification_preferences,default_landing_app,updated_at&user_id=eq.${user.id}`,
        ).catch(() => []),
        restGet(
          supabaseUrl,
          supabaseAnonKey,
          authHeader,
          'account_org_context?select=org_id,org_name,member_role,stripe_customer_id,stripe_subscription_id,billing_name,billing_email,billing_phone&order=member_created_at.asc&limit=1',
        ).catch(() => []),
        restGet(
          supabaseUrl,
          supabaseAnonKey,
          authHeader,
          'account_org_member_app_assignments?select=org_member_id,user_id,full_name,email,role,assigned_apps&order=created_at.asc',
        ).catch(() => []),
        restGet(
          supabaseUrl,
          supabaseAnonKey,
          authHeader,
          'account_org_audit_events?select=id,org_id,actor_user_id,actor_email,actor_full_name,action,app_code,target_org_member_id,target_user_email,metadata,created_at&order=created_at.desc&limit=200',
        ).catch(() => []),
      ])

      await rpc(supabaseUrl, supabaseAnonKey, authHeader, 'log_my_account_audit_event', {
        p_action: 'account_exported',
      }).catch(() => null)

      return json(req, 200, {
        exportedAt: new Date().toISOString(),
        authUser: user,
        profile,
        preferences,
        organisation: orgContext,
        memberAssignments: assignments,
        activity: auditEvents,
      })
    }

    if (action === 'delete-account') {
      if (body.confirmation !== 'DELETE') {
        return json(req, 400, { error: 'Deletion confirmation must be DELETE' })
      }

      await serviceFetch(supabaseUrl, serviceRoleKey, `/auth/v1/admin/users/${user.id}`, {
        method: 'DELETE',
      })

      return json(req, 200, { success: true })
    }

    return json(req, 400, { error: 'Unsupported account self-service action' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    const status = message === 'Unauthorized' ? 401 : 400
    return json(req, status, { error: message })
  }
})
