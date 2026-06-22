import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createApiToken,
  createGitHubRepository,
  createSlackProjectSync,
  createWebhook,
  deleteGitHubRepository,
  deleteSlackProjectSync,
  deleteWebhook,
  disconnectProviderIntegration,
  fetchApiTokens,
  fetchAppPermissions,
  fetchFeatureFlags,
  fetchGitHubRepositories,
  fetchGitHubRepositorySyncs,
  fetchOrganisationIntegrations,
  fetchOutboundProviderSyncs,
  fetchRoles,
  fetchSlackProjectSyncs,
  fetchWebhookLogs,
  fetchWebhooks,
  retryProviderSync,
  revokeApiToken,
  setRolePermission,
  startGitHubOAuth,
  startSlackOAuth,
  updateWebhook,
  updateFeatureFlags,
} from '../../api/settings'
import type {
  FeatureFlagUpdateInput,
  OpenKbApiTokenInput,
  OpenKbGitHubRepositoryInput,
  OpenKbProviderDisconnectInput,
  OpenKbProviderSyncRetryInput,
  OpenKbSlackProjectSyncInput,
  OpenKbWebhookInput,
  OpenKbWebhookUpdateInput,
  RolePermissionInput,
} from '../../types'

export const settingsKeys = {
  featureFlags: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'feature-flags'] as const,
  permissions: ['open-kb', 'settings', 'app-permissions'] as const,
  roles: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'roles'] as const,
  apiTokens: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'api-tokens'] as const,
  webhooks: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'webhooks'] as const,
  webhookLogs: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'webhook-logs'] as const,
  organisationIntegrations: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'organisation-integrations'] as const,
  githubRepositories: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'github-repositories'] as const,
  githubRepositorySyncs: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'github-repository-syncs'] as const,
  slackProjectSyncs: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'slack-project-syncs'] as const,
  outboundProviderSyncs: (organisationId: string | null) => ['open-kb', 'settings', organisationId, 'outbound-provider-syncs'] as const,
}

export const useFeatureFlags = (organisationId: string | null) =>
  useQuery({
    queryKey: settingsKeys.featureFlags(organisationId),
    queryFn: () => fetchFeatureFlags(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })

export const useAppPermissions = () =>
  useQuery({
    queryKey: settingsKeys.permissions,
    queryFn: fetchAppPermissions,
    staleTime: 300_000,
  })

export const useRoles = (organisationId: string | null) =>
  useQuery({
    queryKey: settingsKeys.roles(organisationId),
    queryFn: () => fetchRoles(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })

export const useApiTokens = (organisationId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: settingsKeys.apiTokens(organisationId),
    queryFn: () => fetchApiTokens(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useWebhooks = (organisationId: string | null, enabled = true) =>
  useQuery({
    queryKey: settingsKeys.webhooks(organisationId),
    queryFn: () => fetchWebhooks(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useWebhookLogs = (organisationId: string | null, enabled = true) =>
  useQuery({
    queryKey: settingsKeys.webhookLogs(organisationId),
    queryFn: () => fetchWebhookLogs(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useOrganisationIntegrations = (organisationId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: settingsKeys.organisationIntegrations(organisationId),
    queryFn: () => fetchOrganisationIntegrations(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useGitHubRepositories = (organisationId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: settingsKeys.githubRepositories(organisationId),
    queryFn: () => fetchGitHubRepositories(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useGitHubRepositorySyncs = (organisationId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: settingsKeys.githubRepositorySyncs(organisationId),
    queryFn: () => fetchGitHubRepositorySyncs(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useSlackProjectSyncs = (organisationId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: settingsKeys.slackProjectSyncs(organisationId),
    queryFn: () => fetchSlackProjectSyncs(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useOutboundProviderSyncs = (organisationId: string | null, enabled: boolean) =>
  useQuery({
    queryKey: settingsKeys.outboundProviderSyncs(organisationId),
    queryFn: () => fetchOutboundProviderSyncs(organisationId ?? ''),
    enabled: Boolean(organisationId && enabled),
  })

export const useUpdateFeatureFlags = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: FeatureFlagUpdateInput) => updateFeatureFlags(input),
    onSuccess: async (flags, input) => {
      queryClient.setQueryData(settingsKeys.featureFlags(input.organisation_id), flags)
    },
  })
}

export const useSetRolePermission = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: RolePermissionInput) => setRolePermission(input),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.roles(input.organisation_id) }),
        queryClient.invalidateQueries({ queryKey: ['open-kb', 'permissions', input.organisation_id] }),
      ])
    },
  })
}

export const useCreateApiToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbApiTokenInput) => createApiToken(input),
    onSuccess: async (_token, input) => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.apiTokens(input.organisation_id) })
    },
  })
}

export const useRevokeApiToken = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: revokeApiToken,
    onSuccess: async (_token, input) => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.apiTokens(input.organisationId) })
    },
  })
}

export const useCreateWebhook = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbWebhookInput) => createWebhook(input),
    onSuccess: async (_webhook, input) => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks(input.organisation_id) })
    },
  })
}

export const useUpdateWebhook = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbWebhookUpdateInput) => updateWebhook(input),
    onSuccess: async (_webhook, input) => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks(input.organisation_id) })
    },
  })
}

export const useDeleteWebhook = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteWebhook,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.webhooks(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.webhookLogs(input.organisationId) }),
      ])
    },
  })
}

export const useCreateGitHubRepository = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbGitHubRepositoryInput) => createGitHubRepository(input),
    onSuccess: async (_repository, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.organisationIntegrations(input.organisation_id) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.githubRepositories(input.organisation_id) }),
      ])
    },
  })
}

export const useDeleteGitHubRepository = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteGitHubRepository,
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.githubRepositories(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.githubRepositorySyncs(input.organisationId) }),
      ])
    },
  })
}

export const useCreateSlackProjectSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbSlackProjectSyncInput) => createSlackProjectSync(input),
    onSuccess: async (_sync, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.organisationIntegrations(input.organisation_id) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.slackProjectSyncs(input.organisation_id) }),
      ])
    },
  })
}

export const useDeleteSlackProjectSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSlackProjectSync,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: settingsKeys.slackProjectSyncs(input.organisationId) })
    },
  })
}

export const useRetryProviderSync = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbProviderSyncRetryInput) => retryProviderSync(input),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.outboundProviderSyncs(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.githubRepositorySyncs(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.slackProjectSyncs(input.organisationId) }),
      ])
    },
  })
}

export const useDisconnectProviderIntegration = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: OpenKbProviderDisconnectInput) => disconnectProviderIntegration(input),
    onSuccess: async (_result, input) => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: settingsKeys.organisationIntegrations(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.githubRepositories(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.githubRepositorySyncs(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.slackProjectSyncs(input.organisationId) }),
        queryClient.invalidateQueries({ queryKey: settingsKeys.outboundProviderSyncs(input.organisationId) }),
      ])
    },
  })
}

export const useStartGitHubOAuth = () =>
  useMutation({
    mutationFn: startGitHubOAuth,
  })

export const useStartSlackOAuth = () =>
  useMutation({
    mutationFn: startSlackOAuth,
  })
