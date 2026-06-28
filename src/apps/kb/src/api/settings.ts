import { db, supabase } from '../supabaseClient'
import type {
  AppPermission,
  FeatureFlagUpdateInput,
  FeatureFlags,
  OpenKbApiToken,
  OpenKbApiTokenInput,
  OpenKbGitHubRepository,
  OpenKbGitHubRepositoryInput,
  OpenKbGitHubRepositorySync,
  OpenKbOrganisationIntegration,
  OpenKbProviderDisconnectInput,
  OpenKbOutboundProviderSync,
  OpenKbProviderSyncRetryInput,
  OpenKbSlackProjectSync,
  OpenKbSlackProjectSyncInput,
  OpenKbWebhook,
  OpenKbWebhookInput,
  OpenKbWebhookLog,
  OpenKbWebhookUpdateInput,
  OpenKbRole,
  RolePermissionInput,
} from '../types'

type RoleRow = Omit<OpenKbRole, 'permission_codes'> & {
  role_permissions: Array<{ permission_code: string }> | null
}

const apiTokenSelect = 'id, organisation_id, profile_id, name, scopes, expires_at, last_used_at, revoked_at, created_at, updated_at'
const webhookSelect = 'id, organisation_id, name, url, events, status, description_text, created_at, updated_at, deleted_at'
const organisationIntegrationSelect = 'id, organisation_id, integration_id, provider, name, status, external_account_id, scopes, expires_at, created_at, updated_at, deleted_at'
const githubRepositorySelect = 'id, organisation_id, project_id, organisation_integration_id, repository_owner, repository_name, installation_id, default_branch, status, payload, created_at, updated_at, deleted_at'
const githubRepositorySyncSelect = 'id, organisation_id, project_id, github_repository_id, sync_type, name, title, status, external_id, attempt_count, next_retry_at, processed_at, last_error_text, created_at, updated_at, deleted_at'
const githubOutboundCommentSyncSelect = 'id, organisation_id, project_id, issue_id, comment_id, github_repository_id, title, status, external_id, external_comment_url, attempt_count, next_retry_at, processed_at, last_error_text, payload, created_at, updated_at, deleted_at'
const slackProjectSyncSelect = 'id, organisation_id, project_id, issue_id, comment_id, organisation_integration_id, channel_id, channel_name, sync_direction, status, external_id, attempt_count, next_retry_at, processed_at, last_error_text, payload, created_at, updated_at, deleted_at'
const webhookLogSelect = `
  id,
  organisation_id,
  project_id,
  webhook_id,
  name,
  title,
  status,
  external_id,
  http_status,
  attempt_count,
  delivered_at,
  next_retry_at,
  payload,
  metadata,
  created_at,
  updated_at,
  deleted_at,
  webhook:webhooks(id, name, url, status)
`

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchFeatureFlags = async (organisationId: string): Promise<FeatureFlags> => {
  const { data, error } = await db
    .from('feature_flags')
    .select('organisation_id, github_sync_enabled, slack_sync_enabled, api_tokens_enabled, updated_at, updated_by')
    .eq('organisation_id', organisationId)
    .single()

  if (error) throw error

  return data as FeatureFlags
}

export const updateFeatureFlags = async ({
  organisation_id,
  ...input
}: FeatureFlagUpdateInput): Promise<FeatureFlags> => {
  const { data, error } = await db
    .from('feature_flags')
    .update(input)
    .eq('organisation_id', organisation_id)
    .select('organisation_id, github_sync_enabled, slack_sync_enabled, api_tokens_enabled, updated_at, updated_by')
    .single()

  if (error) throw error

  return data as FeatureFlags
}

export const fetchAppPermissions = async (): Promise<AppPermission[]> => {
  const { data, error } = await db
    .from('app_permissions')
    .select('code, description, page_key, action_key, label, sort_order, hidden, deprecated')
    .eq('hidden', false)
    .eq('deprecated', false)
    .order('sort_order', { ascending: true })

  if (error) throw error

  return (data ?? []) as AppPermission[]
}

export const fetchRoles = async (organisationId: string): Promise<OpenKbRole[]> => {
  const { data, error } = await db
    .from('roles')
    .select('id, organisation_id, name, description, role_rank, created_at, updated_at, role_permissions(permission_code)')
    .eq('organisation_id', organisationId)
    .order('role_rank', { ascending: false })
    .order('name', { ascending: true })

  if (error) throw error

  return ((data ?? []) as unknown as RoleRow[]).map((role) => ({
    ...role,
    permission_codes: (role.role_permissions ?? []).map((permission) => permission.permission_code),
  }))
}

export const setRolePermission = async ({
  role_id,
  permission_code,
  enabled,
}: RolePermissionInput) => {
  if (enabled) {
    const { error } = await db
      .from('role_permissions')
      .insert({ role_id, permission_code })

    if (error) throw error
    return
  }

  const { error } = await db
    .from('role_permissions')
    .delete()
    .eq('role_id', role_id)
    .eq('permission_code', permission_code)

  if (error) throw error
}

export const fetchApiTokens = async (organisationId: string): Promise<OpenKbApiToken[]> => {
  const { data, error } = await db
    .from('api_tokens')
    .select(apiTokenSelect)
    .eq('organisation_id', organisationId)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as OpenKbApiToken[]
}

export const createApiToken = async (input: OpenKbApiTokenInput): Promise<OpenKbApiToken> => {
  const { data, error } = await db
    .from('api_tokens')
    .insert({
      organisation_id: input.organisation_id,
      profile_id: input.profile_id,
      name: input.name.trim(),
      token_hash: input.token_hash,
      scopes: input.scopes,
      expires_at: input.expires_at || null,
    })
    .select(apiTokenSelect)
    .single()

  if (error) throw error

  return data as OpenKbApiToken
}

export const revokeApiToken = async ({
  organisationId,
  tokenId,
}: {
  organisationId: string
  tokenId: string
}): Promise<OpenKbApiToken> => {
  const { data, error } = await db
    .from('api_tokens')
    .update({ revoked_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', tokenId)
    .select(apiTokenSelect)
    .single()

  if (error) throw error

  return data as OpenKbApiToken
}

export const fetchWebhooks = async (organisationId: string): Promise<OpenKbWebhook[]> => {
  const { data, error } = await db
    .from('webhooks')
    .select(webhookSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as OpenKbWebhook[]
}

export const createWebhook = async (input: OpenKbWebhookInput): Promise<OpenKbWebhook> => {
  const { data, error } = await db
    .from('webhooks')
    .insert({
      organisation_id: input.organisation_id,
      name: input.name.trim(),
      title: input.name.trim(),
      url: input.url.trim(),
      events: input.events,
      status: input.status ?? 'active',
      description_text: input.description_text?.trim() || null,
      secret_hash: input.secret_hash || null,
      project_id: null,
      issue_id: null,
    })
    .select(webhookSelect)
    .single()

  if (error) throw error

  return data as OpenKbWebhook
}

export const updateWebhook = async ({
  id,
  organisation_id,
  ...input
}: OpenKbWebhookUpdateInput): Promise<OpenKbWebhook> => {
  const { data, error } = await db
    .from('webhooks')
    .update({
      ...input,
      name: input.name?.trim(),
      title: input.name?.trim(),
      url: input.url?.trim(),
      description_text: input.description_text?.trim() || input.description_text,
      project_id: null,
      issue_id: null,
    })
    .eq('organisation_id', organisation_id)
    .eq('id', id)
    .select(webhookSelect)
    .single()

  if (error) throw error

  return data as OpenKbWebhook
}

export const deleteWebhook = async ({
  organisationId,
  webhookId,
}: {
  organisationId: string
  webhookId: string
}) => {
  const { error } = await db
    .from('webhooks')
    .update({ deleted_at: new Date().toISOString(), status: 'disabled' })
    .eq('organisation_id', organisationId)
    .eq('id', webhookId)

  if (error) throw error
}

export const fetchWebhookLogs = async (organisationId: string): Promise<OpenKbWebhookLog[]> => {
  const { data, error } = await db
    .from('webhook_logs')
    .select(webhookLogSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return ((data ?? []) as Array<OpenKbWebhookLog & { webhook: OpenKbWebhookLog['webhook'] | OpenKbWebhookLog['webhook'][] }>).map((row) => ({
    ...row,
    webhook: normalizeSingle(row.webhook),
  }))
}

export const fetchOrganisationIntegrations = async (organisationId: string): Promise<OpenKbOrganisationIntegration[]> => {
  const { data, error } = await db
    .from('organisation_integrations')
    .select(organisationIntegrationSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as OpenKbOrganisationIntegration[]
}

const ensureOrganisationIntegration = async (
  organisationId: string,
  provider: 'github' | 'slack',
): Promise<OpenKbOrganisationIntegration> => {
  const existing = await fetchOrganisationIntegrations(organisationId)
  const current = existing.find((integration) => integration.provider === provider)
  if (current) return current

  const { data, error } = await db
    .from('organisation_integrations')
    .insert({
      organisation_id: organisationId,
      provider,
      name: provider === 'github' ? 'GitHub' : 'Slack',
      title: provider === 'github' ? 'GitHub' : 'Slack',
      status: 'connected',
      scopes: [],
      project_id: null,
      issue_id: null,
    })
    .select(organisationIntegrationSelect)
    .single()

  if (error) throw error

  return data as OpenKbOrganisationIntegration
}

export const fetchGitHubRepositories = async (organisationId: string): Promise<OpenKbGitHubRepository[]> => {
  const { data, error } = await db
    .from('github_repositories')
    .select(githubRepositorySelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as OpenKbGitHubRepository[]
}

export const createGitHubRepository = async (input: OpenKbGitHubRepositoryInput): Promise<OpenKbGitHubRepository> => {
  const integration = await ensureOrganisationIntegration(input.organisation_id, 'github')
  const { data, error } = await db
    .from('github_repositories')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id || null,
      organisation_integration_id: integration.id,
      repository_owner: input.repository_owner.trim(),
      repository_name: input.repository_name.trim(),
      installation_id: input.installation_id?.trim() || null,
      default_branch: input.default_branch?.trim() || 'main',
      name: `${input.repository_owner.trim()}/${input.repository_name.trim()}`,
      title: `${input.repository_owner.trim()}/${input.repository_name.trim()}`,
      status: 'active',
      issue_id: null,
    })
    .select(githubRepositorySelect)
    .single()

  if (error) throw error

  return data as OpenKbGitHubRepository
}

export const deleteGitHubRepository = async ({
  organisationId,
  repositoryId,
}: {
  organisationId: string
  repositoryId: string
}) => {
  const { error } = await db
    .from('github_repositories')
    .update({ deleted_at: new Date().toISOString(), status: 'disabled' })
    .eq('organisation_id', organisationId)
    .eq('id', repositoryId)

  if (error) throw error
}

export const fetchGitHubRepositorySyncs = async (organisationId: string): Promise<OpenKbGitHubRepositorySync[]> => {
  const { data, error } = await db
    .from('github_repository_syncs')
    .select(githubRepositorySyncSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return (data ?? []) as OpenKbGitHubRepositorySync[]
}

export const fetchSlackProjectSyncs = async (organisationId: string): Promise<OpenKbSlackProjectSync[]> => {
  const { data, error } = await db
    .from('slack_project_syncs')
    .select(slackProjectSyncSelect)
    .eq('organisation_id', organisationId)
    .eq('sync_direction', 'inbound')
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as OpenKbSlackProjectSync[]
}

export const fetchOutboundProviderSyncs = async (organisationId: string): Promise<OpenKbOutboundProviderSync[]> => {
  const [githubResult, slackResult] = await Promise.all([
    db
      .from('github_comment_syncs')
      .select(githubOutboundCommentSyncSelect)
      .eq('organisation_id', organisationId)
      .eq('sync_direction', 'outbound')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
    db
      .from('slack_project_syncs')
      .select(slackProjectSyncSelect)
      .eq('organisation_id', organisationId)
      .eq('sync_direction', 'outbound')
      .is('deleted_at', null)
      .order('created_at', { ascending: false })
      .limit(50),
  ])

  if (githubResult.error) throw githubResult.error
  if (slackResult.error) throw slackResult.error

  const githubRows = ((githubResult.data ?? []) as Array<{
    id: string
    organisation_id: string
    project_id: string | null
    issue_id: string | null
    comment_id: string | null
    github_repository_id: string | null
    title: string | null
    status: string | null
    external_id: string | null
    external_comment_url: string | null
    attempt_count: number | null
    next_retry_at: string | null
    processed_at: string | null
    last_error_text: string | null
    payload: Record<string, unknown> | null
    created_at: string
    updated_at: string | null
    deleted_at: string | null
  }>).map((row): OpenKbOutboundProviderSync => ({
    id: row.id,
    provider: 'github',
    organisation_id: row.organisation_id,
    project_id: row.project_id,
    issue_id: row.issue_id,
    comment_id: row.comment_id,
    title: row.title,
    status: row.status,
    external_id: row.external_id,
    attempt_count: row.attempt_count ?? 0,
    next_retry_at: row.next_retry_at,
    processed_at: row.processed_at,
    last_error_text: row.last_error_text,
    target: row.external_comment_url ?? row.github_repository_id,
    payload: row.payload ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }))

  const slackRows = ((slackResult.data ?? []) as OpenKbSlackProjectSync[]).map((row): OpenKbOutboundProviderSync => ({
    id: row.id,
    provider: 'slack',
    organisation_id: row.organisation_id,
    project_id: row.project_id,
    issue_id: row.issue_id ?? null,
    comment_id: row.comment_id ?? null,
    title: row.channel_name || row.channel_id || 'Slack message',
    status: row.status,
    external_id: row.external_id,
    attempt_count: row.attempt_count ?? 0,
    next_retry_at: row.next_retry_at ?? null,
    processed_at: row.processed_at ?? null,
    last_error_text: row.last_error_text ?? null,
    target: row.channel_name || row.channel_id,
    payload: row.payload ?? {},
    created_at: row.created_at,
    updated_at: row.updated_at,
    deleted_at: row.deleted_at,
  }))

  return [...githubRows, ...slackRows]
    .sort((left, right) => new Date(right.created_at).getTime() - new Date(left.created_at).getTime())
    .slice(0, 100)
}

export const retryProviderSync = async ({ provider, syncId }: OpenKbProviderSyncRetryInput) => {
  const { data, error } = await db.rpc('retry_provider_sync', {
    p_provider: provider,
    p_sync_id: syncId,
  })

  if (error) throw error

  return Boolean(data)
}

export const disconnectProviderIntegration = async ({ organisationId, provider }: OpenKbProviderDisconnectInput) => {
  const { data, error } = await db.rpc('disconnect_provider_integration', {
    p_org_id: organisationId,
    p_provider: provider,
  })

  if (error) throw error

  return Boolean(data)
}

export const createSlackProjectSync = async (input: OpenKbSlackProjectSyncInput): Promise<OpenKbSlackProjectSync> => {
  const integration = await ensureOrganisationIntegration(input.organisation_id, 'slack')
  const { data, error } = await db
    .from('slack_project_syncs')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      organisation_integration_id: integration.id,
      channel_id: input.channel_id.trim(),
      channel_name: input.channel_name?.trim() || null,
      name: input.channel_name?.trim() || input.channel_id.trim(),
      title: input.channel_name?.trim() || input.channel_id.trim(),
      status: 'active',
      issue_id: null,
    })
    .select(slackProjectSyncSelect)
    .single()

  if (error) throw error

  return data as OpenKbSlackProjectSync
}

export const deleteSlackProjectSync = async ({
  organisationId,
  syncId,
}: {
  organisationId: string
  syncId: string
}) => {
  const { error } = await db
    .from('slack_project_syncs')
    .update({ deleted_at: new Date().toISOString(), status: 'disabled' })
    .eq('organisation_id', organisationId)
    .eq('id', syncId)

  if (error) throw error
}

export const startGitHubOAuth = async ({
  organisationId,
  returnTo,
}: {
  organisationId: string
  returnTo: string
}) => {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('open-kb-github-oauth', {
    body: { organisationId, returnTo },
  })

  if (error) throw error
  if (!data?.url) throw new Error('GitHub OAuth did not return an authorization URL')
  return data.url
}

export const startSlackOAuth = async ({
  organisationId,
  returnTo,
}: {
  organisationId: string
  returnTo: string
}) => {
  const { data, error } = await supabase.functions.invoke<{ url: string }>('open-kb-slack-oauth', {
    body: { organisationId, returnTo },
  })

  if (error) throw error
  if (!data?.url) throw new Error('Slack OAuth did not return an authorization URL')
  return data.url
}
