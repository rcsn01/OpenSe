import { useMemo, useState } from 'react'
import { Badge, Button, EmptyState, Input, Select } from '@repo/ui'
import { Activity, AlertTriangle, Clock3, Github, RotateCcw, Slack, Trash2 } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import {
  ApiTokensSection,
  FeatureFlagsSection,
  RolePermissionsSection,
  WebhooksSection,
} from '../components/settings/SettingsSections'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import {
  useAppPermissions,
  useApiTokens,
  useCreateGitHubRepository,
  useCreateApiToken,
  useCreateSlackProjectSync,
  useCreateWebhook,
  useDeleteGitHubRepository,
  useDeleteSlackProjectSync,
  useDeleteWebhook,
  useDisconnectProviderIntegration,
  useFeatureFlags,
  useGitHubRepositories,
  useGitHubRepositorySyncs,
  useOrganisationIntegrations,
  useOutboundProviderSyncs,
  useRetryProviderSync,
  useRevokeApiToken,
  useRoles,
  useSetRolePermission,
  useSlackProjectSyncs,
  useStartGitHubOAuth,
  useStartSlackOAuth,
  useUpdateWebhook,
  useWebhookLogs,
  useWebhooks,
  useUpdateFeatureFlags,
} from '../hooks/queries/useSettings'
import { useProjects } from '../hooks/queries/useProjects'
import type { AppPermission, FeatureFlags, OpenKbOutboundProviderSync, OpenKbRole, OpenKbWebhookStatus } from '../types'
import { formatDateTime } from '../lib/dateFormatting'
import {
  generateApiToken,
  generateWebhookSecret,
  groupPermissions,
  providerSyncStatusVariant,
  providerSyncTitle,
  roleCanToggle,
  sha256Hex,
} from '../lib/settingsUtils'

export const SettingsPage = () => {
  const { user } = useAuth()
  const { organisationId } = useOrganisation()
  const { data: myPermissions = [] } = useMyPermissions(organisationId)
  const canManageIntegrations = myPermissions.includes('settings.integrations.manage')
  const canManageAutomation = myPermissions.includes('automation.manage')
  const canManageRoles = myPermissions.includes('settings.roles.manage')
  const { data: featureFlags, isLoading: flagsLoading } = useFeatureFlags(organisationId)
  const { data: apiTokens = [], isLoading: apiTokensLoading } = useApiTokens(organisationId, Boolean(featureFlags?.api_tokens_enabled))
  const integrationFlagsEnabled = Boolean(featureFlags?.github_sync_enabled || featureFlags?.slack_sync_enabled)
  const { data: organisationIntegrations = [] } = useOrganisationIntegrations(organisationId, integrationFlagsEnabled)
  const { data: githubRepositories = [], isLoading: githubRepositoriesLoading } = useGitHubRepositories(organisationId, Boolean(featureFlags?.github_sync_enabled))
  const { data: githubRepositorySyncs = [], isLoading: githubSyncsLoading } = useGitHubRepositorySyncs(organisationId, Boolean(featureFlags?.github_sync_enabled))
  const { data: slackProjectSyncs = [], isLoading: slackSyncsLoading } = useSlackProjectSyncs(organisationId, Boolean(featureFlags?.slack_sync_enabled))
  const { data: outboundProviderSyncs = [], isLoading: outboundProviderSyncsLoading } = useOutboundProviderSyncs(organisationId, integrationFlagsEnabled)
  const { data: webhooks = [], isLoading: webhooksLoading } = useWebhooks(organisationId, canManageAutomation)
  const { data: webhookLogs = [], isLoading: webhookLogsLoading } = useWebhookLogs(organisationId, canManageAutomation)
  const { data: appPermissions = [], isLoading: permissionsLoading } = useAppPermissions()
  const { data: roles = [], isLoading: rolesLoading } = useRoles(organisationId)
  const { data: projects = [] } = useProjects(organisationId)
  const updateFeatureFlags = useUpdateFeatureFlags()
  const setRolePermission = useSetRolePermission()
  const createApiToken = useCreateApiToken()
  const revokeApiToken = useRevokeApiToken()
  const createGitHubRepository = useCreateGitHubRepository()
  const deleteGitHubRepository = useDeleteGitHubRepository()
  const createSlackProjectSync = useCreateSlackProjectSync()
  const deleteSlackProjectSync = useDeleteSlackProjectSync()
  const retryProviderSync = useRetryProviderSync()
  const disconnectProviderIntegration = useDisconnectProviderIntegration()
  const startGitHubOAuth = useStartGitHubOAuth()
  const startSlackOAuth = useStartSlackOAuth()
  const createWebhook = useCreateWebhook()
  const updateWebhook = useUpdateWebhook()
  const deleteWebhook = useDeleteWebhook()
  const [tokenName, setTokenName] = useState('')
  const [tokenScope, setTokenScope] = useState('issues:read')
  const [tokenExpiryDays, setTokenExpiryDays] = useState('90')
  const [createdToken, setCreatedToken] = useState<string | null>(null)
  const [webhookName, setWebhookName] = useState('')
  const [webhookUrl, setWebhookUrl] = useState('')
  const [webhookEventsValue, setWebhookEventsValue] = useState<string[]>(['issue.created', 'issue.updated'])
  const [createdWebhookSecret, setCreatedWebhookSecret] = useState<string | null>(null)
  const [githubOwner, setGithubOwner] = useState('')
  const [githubRepo, setGithubRepo] = useState('')
  const [githubInstallationId, setGithubInstallationId] = useState('')
  const [githubProjectId, setGithubProjectId] = useState('')
  const [slackProjectId, setSlackProjectId] = useState('')
  const [slackChannelId, setSlackChannelId] = useState('')
  const [slackChannelName, setSlackChannelName] = useState('')
  const permissionGroups = useMemo(() => groupPermissions(appPermissions), [appPermissions])
  const groupedEntries = Object.entries(permissionGroups)
  const providerConnections = {
    github: organisationIntegrations.find((integration) => integration.provider === 'github') ?? null,
    slack: organisationIntegrations.find((integration) => integration.provider === 'slack') ?? null,
  }

  const handleFeatureFlagChange = async (
    key: keyof Pick<FeatureFlags, 'github_sync_enabled' | 'slack_sync_enabled' | 'api_tokens_enabled'>,
    enabled: boolean,
  ) => {
    if (!organisationId || !featureFlags) return

    try {
      await updateFeatureFlags.mutateAsync({
        organisation_id: organisationId,
        [key]: enabled,
      })
      toast.success('Feature flag updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update feature flag')
    }
  }

  const handleRolePermissionChange = async (
    role: OpenKbRole,
    permission: AppPermission,
    enabled: boolean,
  ) => {
    if (!organisationId || !roleCanToggle(role)) return

    try {
      await setRolePermission.mutateAsync({
        organisation_id: organisationId,
        role_id: role.id,
        permission_code: permission.code,
        enabled,
      })
      toast.success('Role permission updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update role permission')
    }
  }

  const handleCreateApiToken = async () => {
    if (!organisationId || !user || !tokenName.trim()) return

    try {
      const rawToken = generateApiToken()
      const tokenHash = await sha256Hex(rawToken)
      const expiryDays = Number(tokenExpiryDays)
      const expiresAt = Number.isFinite(expiryDays) && expiryDays > 0
        ? new Date(Date.now() + expiryDays * 86_400_000).toISOString()
        : null

      await createApiToken.mutateAsync({
        organisation_id: organisationId,
        profile_id: user.id,
        name: tokenName,
        token_hash: tokenHash,
        scopes: [tokenScope],
        expires_at: expiresAt,
      })
      setTokenName('')
      setCreatedToken(rawToken)
      toast.success('API token created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create API token')
    }
  }

  const handleRevokeApiToken = async (tokenId: string) => {
    if (!organisationId) return

    try {
      await revokeApiToken.mutateAsync({ organisationId, tokenId })
      toast.success('API token revoked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to revoke API token')
    }
  }

  const handleWebhookEventToggle = (eventName: string, enabled: boolean) => {
    setWebhookEventsValue((current) => {
      const next = enabled
        ? [...new Set([...current, eventName])]
        : current.filter((item) => item !== eventName)
      return next.length > 0 ? next : current
    })
  }

  const handleCreateWebhook = async () => {
    if (!organisationId || !webhookName.trim() || !webhookUrl.trim()) return

    try {
      const rawSecret = generateWebhookSecret()
      await createWebhook.mutateAsync({
        organisation_id: organisationId,
        name: webhookName,
        url: webhookUrl,
        events: webhookEventsValue,
        status: 'active',
        secret_hash: await sha256Hex(rawSecret),
      })
      setWebhookName('')
      setWebhookUrl('')
      setCreatedWebhookSecret(rawSecret)
      toast.success('Webhook created')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to create webhook')
    }
  }

  const handleWebhookStatus = async (webhookId: string, status: OpenKbWebhookStatus) => {
    if (!organisationId) return

    try {
      await updateWebhook.mutateAsync({
        id: webhookId,
        organisation_id: organisationId,
        status,
      })
      toast.success('Webhook updated')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update webhook')
    }
  }

  const handleDeleteWebhook = async (webhookId: string) => {
    if (!organisationId) return

    try {
      await deleteWebhook.mutateAsync({ organisationId, webhookId })
      toast.success('Webhook removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove webhook')
    }
  }

  const handleCreateGitHubRepository = async () => {
    if (!organisationId || !githubOwner.trim() || !githubRepo.trim()) return

    try {
      await createGitHubRepository.mutateAsync({
        organisation_id: organisationId,
        project_id: githubProjectId || null,
        repository_owner: githubOwner,
        repository_name: githubRepo,
        installation_id: githubInstallationId || null,
        default_branch: 'main',
      })
      setGithubOwner('')
      setGithubRepo('')
      setGithubInstallationId('')
      toast.success('GitHub repository linked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to link GitHub repository')
    }
  }

  const handleDeleteGitHubRepository = async (repositoryId: string) => {
    if (!organisationId) return

    try {
      await deleteGitHubRepository.mutateAsync({ organisationId, repositoryId })
      toast.success('GitHub repository removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove GitHub repository')
    }
  }

  const handleCreateSlackProjectSync = async () => {
    if (!organisationId || !slackProjectId || !slackChannelId.trim()) return

    try {
      await createSlackProjectSync.mutateAsync({
        organisation_id: organisationId,
        project_id: slackProjectId,
        channel_id: slackChannelId,
        channel_name: slackChannelName || null,
      })
      setSlackChannelId('')
      setSlackChannelName('')
      toast.success('Slack project channel linked')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to link Slack channel')
    }
  }

  const handleDeleteSlackProjectSync = async (syncId: string) => {
    if (!organisationId) return

    try {
      await deleteSlackProjectSync.mutateAsync({ organisationId, syncId })
      toast.success('Slack channel removed')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to remove Slack channel')
    }
  }

  const handleRetryProviderSync = async (sync: OpenKbOutboundProviderSync) => {
    if (!organisationId) return

    try {
      await retryProviderSync.mutateAsync({
        organisationId,
        provider: sync.provider,
        syncId: sync.id,
      })
      toast.success('Sync requeued')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to retry sync')
    }
  }

  const handleStartProviderOAuth = async (provider: 'github' | 'slack') => {
    if (!organisationId) return

    try {
      const input = {
        organisationId,
        returnTo: `${window.location.origin}${window.location.pathname}`,
      }
      const url = provider === 'github'
        ? await startGitHubOAuth.mutateAsync(input)
        : await startSlackOAuth.mutateAsync(input)
      window.location.assign(url)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to start ${provider} OAuth`)
    }
  }

  const handleDisconnectProvider = async (provider: 'github' | 'slack') => {
    if (!organisationId) return

    try {
      await disconnectProviderIntegration.mutateAsync({ organisationId, provider })
      toast.success(`${provider === 'github' ? 'GitHub' : 'Slack'} disconnected`)
    } catch (error) {
      toast.error(error instanceof Error ? error.message : `Failed to disconnect ${provider}`)
    }
  }

  if (!featureFlags && !flagsLoading) {
    return (
      <OpenKbPageShell>
        <EmptyState title="Settings unavailable" description="Open-KB feature flags were not initialized for this organisation." />
      </OpenKbPageShell>
    )
  }

  return (
    <OpenKbPageShell isLoading={flagsLoading || permissionsLoading || rolesLoading || apiTokensLoading || webhooksLoading || webhookLogsLoading || githubRepositoriesLoading || githubSyncsLoading || slackSyncsLoading || outboundProviderSyncsLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Settings</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Open-KB feature flags, roles, and permissions.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Badge variant={canManageIntegrations ? 'success' : 'neutral'}>Integrations</Badge>
          <Badge variant={canManageRoles ? 'success' : 'neutral'}>Roles</Badge>
        </div>
      </div>

      <FeatureFlagsSection
        featureFlags={featureFlags}
        canManageIntegrations={canManageIntegrations}
        updatePending={updateFeatureFlags.isPending}
        onChange={handleFeatureFlagChange}
      />

      {integrationFlagsEnabled ? (
        <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
            <div className="flex items-center gap-2">
              <Github className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              <h2 className="text-sm font-semibold">GitHub and Slack setup</h2>
            </div>
            <Badge variant={canManageIntegrations ? 'success' : 'neutral'}>{organisationIntegrations.length} connections</Badge>
          </div>
          <div className="grid gap-3 border-b border-[var(--color-border)] p-4 md:grid-cols-2">
            {([
              { provider: 'github' as const, label: 'GitHub', icon: Github, enabled: Boolean(featureFlags?.github_sync_enabled), connection: providerConnections.github },
              { provider: 'slack' as const, label: 'Slack', icon: Slack, enabled: Boolean(featureFlags?.slack_sync_enabled), connection: providerConnections.slack },
            ]).filter((item) => item.enabled).map((item) => {
              const Icon = item.icon
              const connected = item.connection?.status === 'connected'
              return (
                <div key={item.provider} className="flex flex-wrap items-center justify-between gap-3 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
                  <div className="flex min-w-0 items-center gap-3">
                    <Icon className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <div className="min-w-0">
                      <div className="text-sm font-medium">{item.label}</div>
                      <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                        {connected ? `Connected${item.connection?.updated_at ? ` · updated ${formatDateTime(item.connection.updated_at)}` : ''}` : 'Not connected'}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={connected ? 'success' : item.connection ? 'warning' : 'neutral'}>{item.connection?.status ?? 'not connected'}</Badge>
                    <Button
                      type="button"
                      variant="outline"
                      disabled={!canManageIntegrations || startGitHubOAuth.isPending || startSlackOAuth.isPending}
                      onClick={() => handleStartProviderOAuth(item.provider)}
                    >
                      {connected ? 'Reconnect' : 'Connect'}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label={`Disconnect ${item.label}`}
                      disabled={!canManageIntegrations || !item.connection || item.connection.status === 'disconnected' || disconnectProviderIntegration.isPending}
                      onClick={() => handleDisconnectProvider(item.provider)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="grid gap-4 p-4 xl:grid-cols-2">
            {featureFlags?.github_sync_enabled ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Github className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <h3 className="text-sm font-semibold">GitHub repositories</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleStartProviderOAuth('github')}
                    disabled={!canManageIntegrations || startGitHubOAuth.isPending}
                    loading={startGitHubOAuth.isPending}
                  >
                    <Github className="h-4 w-4" />
                    Connect GitHub
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Input value={githubOwner} onChange={(event) => setGithubOwner(event.target.value)} placeholder="owner" disabled={!canManageIntegrations} />
                  <Input value={githubRepo} onChange={(event) => setGithubRepo(event.target.value)} placeholder="repository" disabled={!canManageIntegrations} />
                  <Input value={githubInstallationId} onChange={(event) => setGithubInstallationId(event.target.value)} placeholder="installation id" disabled={!canManageIntegrations} />
                  <Select
                    aria-label="GitHub project"
                    className="border border-[var(--color-border)] bg-[var(--color-background)]"
                    value={githubProjectId}
                    onChange={(event) => setGithubProjectId(event.target.value)}
                    disabled={!canManageIntegrations}
                    options={[
                      { value: '', label: 'No project mapping' },
                      ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
                    ]}
                  />
                </div>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={handleCreateGitHubRepository}
                  disabled={!canManageIntegrations || !githubOwner.trim() || !githubRepo.trim()}
                  loading={createGitHubRepository.isPending}
                >
                  <Github className="h-4 w-4" />
                  Link repository
                </Button>
                <div className="mt-4 divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                  {githubRepositories.length === 0 ? (
                    <EmptyState title="No GitHub repositories" description="" />
                  ) : githubRepositories.map((repository) => (
                    <div key={repository.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{repository.repository_owner}/{repository.repository_name}</div>
                        <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          {repository.project_id ? projects.find((project) => project.id === repository.project_id)?.name ?? 'Mapped project' : 'No project mapping'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={repository.status === 'active' ? 'success' : 'neutral'}>{repository.status ?? 'active'}</Badge>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Remove GitHub repository"
                          disabled={!canManageIntegrations || deleteGitHubRepository.isPending}
                          onClick={() => handleDeleteGitHubRepository(repository.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
                {githubRepositorySyncs.length > 0 ? (
                  <div className="mt-4 rounded-[var(--radius-md)] border border-[var(--color-border)]">
                    <div className="border-b border-[var(--color-border)] px-3 py-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Recent GitHub events</div>
                    <div className="max-h-56 divide-y divide-[var(--color-border)] overflow-y-auto">
                      {githubRepositorySyncs.slice(0, 8).map((sync) => (
                        <div key={sync.id} className="flex items-center justify-between gap-3 p-3 text-sm">
                          <span className="min-w-0 truncate">{sync.title ?? sync.name ?? sync.sync_type ?? 'GitHub event'}</span>
                          <Badge variant={sync.status === 'received' ? 'success' : 'neutral'}>{sync.status ?? 'queued'}</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : null}
              </div>
            ) : null}

            {featureFlags?.slack_sync_enabled ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Slack className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <h3 className="text-sm font-semibold">Slack project channels</h3>
                  </div>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => handleStartProviderOAuth('slack')}
                    disabled={!canManageIntegrations || startSlackOAuth.isPending}
                    loading={startSlackOAuth.isPending}
                  >
                    <Slack className="h-4 w-4" />
                    Connect Slack
                  </Button>
                </div>
                <div className="grid gap-2 md:grid-cols-2">
                  <Select
                    aria-label="Slack project"
                    className="border border-[var(--color-border)] bg-[var(--color-background)]"
                    value={slackProjectId}
                    onChange={(event) => setSlackProjectId(event.target.value)}
                    disabled={!canManageIntegrations}
                    options={[
                      { value: '', label: 'Select project' },
                      ...projects.map((project) => ({ value: project.id, label: `${project.identifier} · ${project.name}` })),
                    ]}
                  />
                  <Input value={slackChannelId} onChange={(event) => setSlackChannelId(event.target.value)} placeholder="C0123456789" disabled={!canManageIntegrations} />
                  <Input value={slackChannelName} onChange={(event) => setSlackChannelName(event.target.value)} placeholder="#project-updates" disabled={!canManageIntegrations} />
                </div>
                <Button
                  type="button"
                  className="mt-3"
                  onClick={handleCreateSlackProjectSync}
                  disabled={!canManageIntegrations || !slackProjectId || !slackChannelId.trim()}
                  loading={createSlackProjectSync.isPending}
                >
                  <Slack className="h-4 w-4" />
                  Link channel
                </Button>
                <div className="mt-4 divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                  {slackProjectSyncs.length === 0 ? (
                    <EmptyState title="No Slack channels" description="" />
                  ) : slackProjectSyncs.map((sync) => (
                    <div key={sync.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-medium">{sync.channel_name || sync.channel_id}</div>
                        <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          {projects.find((project) => project.id === sync.project_id)?.name ?? 'Mapped project'}
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={sync.status === 'active' ? 'success' : sync.status === 'received' ? 'info' : 'neutral'}>{sync.status ?? 'active'}</Badge>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Remove Slack channel"
                          disabled={!canManageIntegrations || deleteSlackProjectSync.isPending}
                          onClick={() => handleDeleteSlackProjectSync(sync.id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : null}

            {integrationFlagsEnabled ? (
              <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4 xl:col-span-2">
                <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <Activity className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                    <h3 className="text-sm font-semibold">Outbound sync queue</h3>
                  </div>
                  <Badge variant={outboundProviderSyncs.some((sync) => sync.status === 'failed') ? 'warning' : 'neutral'}>
                    {outboundProviderSyncs.length} queued
                  </Badge>
                </div>
                <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)]">
                  {outboundProviderSyncs.length === 0 ? (
                    <EmptyState title="No outbound syncs" description="" />
                  ) : outboundProviderSyncs.slice(0, 12).map((sync) => {
                    const canRetrySync = canManageIntegrations && sync.status !== 'processed'
                    return (
                      <div key={`${sync.provider}-${sync.id}`} className="flex flex-wrap items-start justify-between gap-3 p-3">
                        <div className="min-w-0 flex-1">
                          <div className="flex flex-wrap items-center gap-2">
                            {sync.provider === 'github' ? (
                              <Github className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                            ) : (
                              <Slack className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                            )}
                            <span className="min-w-0 truncate text-sm font-medium">{providerSyncTitle(sync)}</span>
                            <Badge variant={providerSyncStatusVariant(sync.status)}>{sync.status ?? 'queued'}</Badge>
                          </div>
                          <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-xs text-[var(--color-muted-foreground)]">
                            <span>{sync.provider === 'github' ? 'GitHub' : 'Slack'}{sync.target ? ` · ${sync.target}` : ''}</span>
                            <span>{sync.attempt_count} attempts</span>
                            <span className="inline-flex items-center gap-1">
                              <Clock3 className="h-3.5 w-3.5" />
                              {sync.processed_at ? `Processed ${formatDateTime(sync.processed_at)}` : `Next ${formatDateTime(sync.next_retry_at)}`}
                            </span>
                          </div>
                          {sync.last_error_text ? (
                            <div className="mt-2 flex items-start gap-2 text-xs text-[var(--color-destructive)]">
                              <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                              <span className="line-clamp-2">{sync.last_error_text}</span>
                            </div>
                          ) : null}
                        </div>
                        <Button
                          type="button"
                          size="icon"
                          variant="ghost"
                          aria-label="Retry sync"
                          disabled={!canRetrySync || retryProviderSync.isPending}
                          onClick={() => handleRetryProviderSync(sync)}
                        >
                          <RotateCcw className="h-4 w-4" />
                        </Button>
                      </div>
                    )
                  })}
                </div>
              </div>
            ) : null}
          </div>
        </section>
      ) : null}

      <WebhooksSection
        canManageAutomation={canManageAutomation}
        webhookName={webhookName}
        webhookUrl={webhookUrl}
        webhookEventsValue={webhookEventsValue}
        createdWebhookSecret={createdWebhookSecret}
        webhooks={webhooks}
        webhookLogs={webhookLogs}
        createPending={createWebhook.isPending}
        updatePending={updateWebhook.isPending}
        deletePending={deleteWebhook.isPending}
        onWebhookNameChange={setWebhookName}
        onWebhookUrlChange={setWebhookUrl}
        onWebhookEventToggle={handleWebhookEventToggle}
        onCreateWebhook={handleCreateWebhook}
        onWebhookStatus={handleWebhookStatus}
        onDeleteWebhook={handleDeleteWebhook}
      />

      <ApiTokensSection
        featureFlags={featureFlags}
        canManageAutomation={canManageAutomation}
        tokenName={tokenName}
        tokenScope={tokenScope}
        tokenExpiryDays={tokenExpiryDays}
        createdToken={createdToken}
        apiTokens={apiTokens}
        createPending={createApiToken.isPending}
        revokePending={revokeApiToken.isPending}
        onTokenNameChange={setTokenName}
        onTokenScopeChange={setTokenScope}
        onTokenExpiryDaysChange={setTokenExpiryDays}
        onCreateToken={handleCreateApiToken}
        onRevokeToken={handleRevokeApiToken}
      />

      <RolePermissionsSection
        roles={roles}
        groupedEntries={groupedEntries}
        canManageRoles={canManageRoles}
        setRolePermissionPending={setRolePermission.isPending}
        onRolePermissionChange={handleRolePermissionChange}
      />
    </OpenKbPageShell>
  )
}
