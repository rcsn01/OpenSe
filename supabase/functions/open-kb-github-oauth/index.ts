export {}

import {
  createSignedState,
  encryptCredential,
  json,
  redirect,
  restFetch,
  sha256Hex,
  verifySignedState,
} from '../_shared/open-kb.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type OAuthState = {
  organisation_id: string
  profile_id: string
  return_to: string
  exp: number
  nonce: string
}

type StartRequestBody = {
  organisationId?: string
  returnTo?: string
}

type UserResponse = {
  id: string
}

type GitHubTokenResponse = {
  access_token?: string
  scope?: string
  token_type?: string
  error?: string
  error_description?: string
}

type OrganisationIntegrationRow = {
  id: string
}

const userCanManageIntegrations = async (
  req: Request,
  supabaseUrl: string,
  anonKey: string,
  organisationId: string,
) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return null

  const userResponse = await fetch(`${supabaseUrl}/auth/v1/user`, {
    headers: { apikey: anonKey, Authorization: authHeader },
  })
  if (!userResponse.ok) return null
  const user = await userResponse.json() as UserResponse

  const permissionResponse = await fetch(
    `${supabaseUrl}/rest/v1/my_permissions?organisation_id=eq.${encodeURIComponent(organisationId)}&code=eq.settings.integrations.manage&select=code`,
    {
      headers: {
        apikey: anonKey,
        Authorization: authHeader,
        'Accept-Profile': 'kb',
      },
    },
  )
  if (!permissionResponse.ok) return null
  const permissions = await permissionResponse.json().catch(() => []) as Array<{ code: string }>
  return permissions.length > 0 ? user : null
}

const getFeatureFlags = async (supabaseUrl: string, serviceRoleKey: string, organisationId: string) =>
  await restFetch<Array<{ github_sync_enabled: boolean }>>(
    supabaseUrl,
    serviceRoleKey,
    `feature_flags?organisation_id=eq.${encodeURIComponent(organisationId)}&select=github_sync_enabled`,
  )

const upsertIntegration = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    organisation_id: string
    profile_id: string
    access_token_hash: string
    scopes: string[]
  },
) => {
  const existing = await restFetch<OrganisationIntegrationRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `organisation_integrations?organisation_id=eq.${encodeURIComponent(payload.organisation_id)}&provider=eq.github&deleted_at=is.null&select=id`,
  )
  const row = {
    organisation_id: payload.organisation_id,
    provider: 'github',
    name: 'GitHub',
    title: 'GitHub',
    status: 'connected',
    connected_by_profile_id: payload.profile_id,
    access_token_hash: payload.access_token_hash,
    scopes: payload.scopes,
    project_id: null,
    issue_id: null,
  }

  if (existing[0]) {
    await restFetch(supabaseUrl, serviceRoleKey, `organisation_integrations?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    })
    return existing[0].id
  }

  const created = await restFetch<OrganisationIntegrationRow[]>(supabaseUrl, serviceRoleKey, 'organisation_integrations?select=id', {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(row),
  })
  return created[0]?.id
}

const upsertIntegrationCredential = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  payload: {
    organisation_id: string
    organisation_integration_id: string
    credential_hash: string
    credential_ciphertext: string
    credential_key_version: string
    metadata: Record<string, unknown>
  },
) => {
  const existing = await restFetch<OrganisationIntegrationRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `integration_credentials?organisation_integration_id=eq.${encodeURIComponent(payload.organisation_integration_id)}&select=id`,
  )
  const row = {
    organisation_id: payload.organisation_id,
    organisation_integration_id: payload.organisation_integration_id,
    provider: 'github',
    credential_hash: payload.credential_hash,
    credential_ciphertext: payload.credential_ciphertext,
    credential_key_version: payload.credential_key_version,
    metadata: payload.metadata,
    revoked_at: null,
  }

  if (existing[0]) {
    await restFetch(supabaseUrl, serviceRoleKey, `integration_credentials?id=eq.${encodeURIComponent(existing[0].id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(row),
    })
    return
  }

  await restFetch(supabaseUrl, serviceRoleKey, 'integration_credentials', {
    method: 'POST',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(row),
  })
}

Deno.serve(async (req: Request) => {
  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const clientId = Deno.env.get('OPEN_KB_GITHUB_CLIENT_ID')
  const clientSecret = Deno.env.get('OPEN_KB_GITHUB_CLIENT_SECRET')
  const stateSecret = Deno.env.get('OPEN_KB_OAUTH_STATE_SECRET')
  const redirectUri = Deno.env.get('OPEN_KB_GITHUB_REDIRECT_URI')
  const credentialKey = Deno.env.get('OPEN_KB_INTEGRATION_CREDENTIAL_KEY')
  const credentialKeyVersion = Deno.env.get('OPEN_KB_INTEGRATION_CREDENTIAL_KEY_VERSION') || 'v1'

  if (!supabaseUrl || !serviceRoleKey || !anonKey || !clientId || !clientSecret || !stateSecret || !redirectUri || !credentialKey) {
    return json(503, { error: 'GitHub OAuth is not configured' })
  }

  if (req.method === 'POST') {
    const body = await req.json().catch(() => ({})) as StartRequestBody
    const organisationId = body.organisationId
    if (!organisationId) return json(400, { error: 'organisationId is required' })

    const user = await userCanManageIntegrations(req, supabaseUrl, anonKey, organisationId)
    if (!user) return json(403, { error: 'Missing integration permission' })

    const flags = await getFeatureFlags(supabaseUrl, serviceRoleKey, organisationId)
    if (!flags[0]?.github_sync_enabled) return json(403, { error: 'GitHub sync is disabled' })

    const state = await createSignedState({
      organisation_id: organisationId,
      profile_id: user.id,
      return_to: body.returnTo || '/',
      exp: Date.now() + 10 * 60_000,
      nonce: crypto.randomUUID(),
    }, stateSecret)
    const url = new URL('https://github.com/login/oauth/authorize')
    url.searchParams.set('client_id', clientId)
    url.searchParams.set('redirect_uri', redirectUri)
    url.searchParams.set('scope', 'repo read:org')
    url.searchParams.set('state', state)
    return json(200, { url: url.toString() })
  }

  if (req.method === 'GET') {
    const requestUrl = new URL(req.url)
    const code = requestUrl.searchParams.get('code')
    const state = requestUrl.searchParams.get('state')
    if (!code || !state) return json(400, { error: 'Missing GitHub OAuth code or state' })

    const verifiedState = await verifySignedState<OAuthState>(state, stateSecret)
    const flags = await getFeatureFlags(supabaseUrl, serviceRoleKey, verifiedState.organisation_id)
    if (!flags[0]?.github_sync_enabled) return redirect(`${verifiedState.return_to}?openKbIntegration=github_disabled`)

    const tokenResponse = await fetch('https://github.com/login/oauth/access_token', {
      method: 'POST',
      headers: {
        Accept: 'application/json',
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        client_id: clientId,
        client_secret: clientSecret,
        code,
        redirect_uri: redirectUri,
      }),
    })
    const token = await tokenResponse.json() as GitHubTokenResponse
    if (!tokenResponse.ok || !token.access_token) {
      throw new Error(token.error_description ?? token.error ?? 'GitHub OAuth token exchange failed')
    }

    const accessTokenHash = await sha256Hex(token.access_token)
    const organisationIntegrationId = await upsertIntegration(supabaseUrl, serviceRoleKey, {
      organisation_id: verifiedState.organisation_id,
      profile_id: verifiedState.profile_id,
      access_token_hash: accessTokenHash,
      scopes: (token.scope ?? '').split(',').map((scope) => scope.trim()).filter(Boolean),
    })
    if (!organisationIntegrationId) throw new Error('GitHub integration row was not created')

    await upsertIntegrationCredential(supabaseUrl, serviceRoleKey, {
      organisation_id: verifiedState.organisation_id,
      organisation_integration_id: organisationIntegrationId,
      credential_hash: accessTokenHash,
      credential_ciphertext: await encryptCredential(token.access_token, credentialKey, credentialKeyVersion),
      credential_key_version: credentialKeyVersion,
      metadata: {
        token_type: token.token_type ?? null,
        scopes: (token.scope ?? '').split(',').map((scope) => scope.trim()).filter(Boolean),
      },
    })

    return redirect(`${verifiedState.return_to}?openKbIntegration=github_connected`)
  }

  return json(405, { error: 'Method not allowed' })
})
