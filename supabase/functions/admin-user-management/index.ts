import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { parseEmail, parseNonEmptyString, parsePassword } from '../_shared/request-validation.ts'

type Action = 'create' | 'reset-password' | 'delete'

interface ActionRequest {
  action: Action
  email?: string
  password?: string
  fullName?: string
  targetUserId?: string
  newPassword?: string
}

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

const postJson = async (
  url: string,
  headers: Record<string, string>,
  body: Record<string, unknown>
) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => ({}))
  return { response, data }
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

  const callerHeaders = {
    apikey: supabaseAnonKey,
    Authorization: authHeader,
  }

  const userRes = await fetch(`${supabaseUrl}/auth/v1/user`, {
    method: 'GET',
    headers: callerHeaders,
  })
  const userData = await userRes.json().catch(() => ({}))

  if (!userRes.ok || !userData?.id) {
    return json(req, 401, { error: 'Unauthorized' })
  }

  const { response: adminRes, data: adminData } = await postJson(
    `${supabaseUrl}/rest/v1/rpc/get_super_admin_status`,
    callerHeaders,
    {}
  )

  if (!adminRes.ok || !adminData) {
    return json(req, 403, { error: 'Access denied: Super Admin only' })
  }

  let payload: ActionRequest
  try {
    payload = (await req.json()) as ActionRequest
  } catch {
    return json(req, 400, { error: 'Invalid JSON body' })
  }

  const adminHeaders = {
    apikey: serviceRoleKey,
    Authorization: `Bearer ${serviceRoleKey}`,
  }

  try {
    if (payload.action === 'create') {
      const email = parseEmail(payload.email)
      const password = parsePassword(payload.password, 'password')

      const createRes = await fetch(`${supabaseUrl}/auth/v1/admin/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({
          email,
          password,
          email_confirm: true,
          user_metadata: {
            full_name: payload.fullName ?? null,
          },
        }),
      })

      const createData = await createRes.json().catch(() => ({}))

      if (!createRes.ok || !createData?.id) {
        return json(req, 400, { error: createData?.msg ?? createData?.error_description ?? 'Failed to create user' })
      }

      await fetch(`${supabaseUrl}/rest/v1/profiles?on_conflict=id`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Prefer: 'resolution=merge-duplicates',
          ...adminHeaders,
        },
        body: JSON.stringify([
          {
            id: createData.id,
            email,
            full_name: payload.fullName ?? null,
          },
        ]),
      })

      return json(req, 200, { userId: createData.id })
    }

    if (payload.action === 'reset-password') {
      const targetUserId = parseNonEmptyString(payload.targetUserId, 'targetUserId')
      const newPassword = parsePassword(payload.newPassword, 'newPassword')

      const resetRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...adminHeaders,
        },
        body: JSON.stringify({
          password: newPassword,
        }),
      })

      const resetData = await resetRes.json().catch(() => ({}))

      if (!resetRes.ok) {
        return json(req, 400, { error: resetData?.msg ?? resetData?.error_description ?? 'Failed to reset password' })
      }

      return json(req, 200, { success: true })
    }

    if (payload.action === 'delete') {
      const targetUserId = parseNonEmptyString(payload.targetUserId, 'targetUserId')

      const deleteRes = await fetch(`${supabaseUrl}/auth/v1/admin/users/${targetUserId}`, {
        method: 'DELETE',
        headers: adminHeaders,
      })

      const deleteData = await deleteRes.json().catch(() => ({}))

      if (!deleteRes.ok) {
        return json(req, 400, { error: deleteData?.msg ?? deleteData?.error_description ?? 'Failed to delete user' })
      }

      return json(req, 200, { success: true })
    }

    return json(req, 400, { error: 'Unknown action' })
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : 'Unknown error'
    return json(req, 400, { error: message })
  }
})
