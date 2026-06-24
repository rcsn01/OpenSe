import type { BadgeProps } from '@repo/ui'
import type { AppPermission, FeatureFlags, OpenKbOutboundProviderSync, OpenKbRole } from '../types'

export const tokenScopes = [
  { value: 'issues:read', label: 'Issues read' },
  { value: 'issues:write', label: 'Issues write' },
  { value: 'projects:read', label: 'Projects read' },
  { value: 'automation:write', label: 'Automation write' },
]

export const webhookEvents = [
  { value: 'issue.created', label: 'Issue created' },
  { value: 'issue.updated', label: 'Issue updated' },
  { value: 'comment.created', label: 'Comment created' },
  { value: 'project.updated', label: 'Project updated' },
]

const randomToken = (prefix: string) => {
  const bytes = crypto.getRandomValues(new Uint8Array(32))
  const encoded = btoa(String.fromCharCode(...bytes)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')
  return `${prefix}_${encoded}`
}

export const generateApiToken = () => randomToken('okb')

export const generateWebhookSecret = () => randomToken('whsec')

export const sha256Hex = async (value: string) => {
  const digest = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(value))
  return [...new Uint8Array(digest)].map((byte) => byte.toString(16).padStart(2, '0')).join('')
}

export const featureFlagItems: Array<{
  key: keyof Pick<FeatureFlags, 'github_sync_enabled' | 'slack_sync_enabled' | 'api_tokens_enabled'>
  label: string
  description: string
}> = [
  {
    key: 'github_sync_enabled',
    label: 'GitHub sync',
    description: 'Allows GitHub repository sync configuration.',
  },
  {
    key: 'slack_sync_enabled',
    label: 'Slack sync',
    description: 'Allows Slack project sync configuration.',
  },
  {
    key: 'api_tokens_enabled',
    label: 'API tokens',
    description: 'Allows API token creation for Open-KB automation.',
  },
]

export const groupPermissions = (permissions: AppPermission[]) =>
  permissions.reduce<Record<string, AppPermission[]>>((acc, permission) => {
    const key = permission.page_key ?? 'other'
    acc[key] = [...(acc[key] ?? []), permission]
    return acc
  }, {})

export const formatGroupLabel = (value: string) =>
  value.replace(/\./g, ' ').replace(/(^|\s)\S/g, (letter) => letter.toUpperCase())

export const roleCanToggle = (role: OpenKbRole) => role.name.toLowerCase() !== 'owner'

export const providerSyncStatusVariant = (status: string | null): NonNullable<BadgeProps['variant']> => {
  if (status === 'processed') return 'success'
  if (status === 'failed') return 'danger'
  if (status === 'retrying' || status === 'waiting') return 'warning'
  if (status === 'outbound_pending' || status === 'received') return 'info'
  return 'neutral'
}

export const providerSyncTitle = (sync: OpenKbOutboundProviderSync) => {
  const preview = typeof sync.payload.comment_preview === 'string' ? sync.payload.comment_preview : null
  const issueKey = typeof sync.payload.issue_key === 'string' ? sync.payload.issue_key : null
  return sync.title || issueKey || preview || `${sync.provider === 'github' ? 'GitHub' : 'Slack'} sync`
}
