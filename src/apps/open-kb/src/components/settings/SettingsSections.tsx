import { Badge, Button, EmptyState, Input, Select, cn } from '@repo/ui'
import { Activity, Copy, KeyRound, ShieldCheck, SlidersHorizontal, Trash2, Webhook } from 'lucide-react'
import { toast } from 'sonner'
import type {
  AppPermission,
  FeatureFlags,
  OpenKbApiToken,
  OpenKbRole,
  OpenKbWebhook,
  OpenKbWebhookLog,
  OpenKbWebhookStatus,
} from '../../types'
import {
  featureFlagItems,
  formatGroupLabel,
  roleCanToggle,
  tokenScopes,
  webhookEvents,
} from '../../lib/settingsUtils'

export const FeatureFlagsSection = ({
  featureFlags,
  canManageIntegrations,
  updatePending,
  onChange,
}: {
  featureFlags: FeatureFlags | undefined
  canManageIntegrations: boolean
  updatePending: boolean
  onChange: (
    key: keyof Pick<FeatureFlags, 'github_sync_enabled' | 'slack_sync_enabled' | 'api_tokens_enabled'>,
    enabled: boolean,
  ) => void
}) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="flex min-h-12 items-center gap-2 border-b border-[var(--color-border)] px-4 py-3">
      <SlidersHorizontal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
      <h2 className="text-sm font-semibold">Feature flags</h2>
    </div>
    <div className="grid gap-3 p-4 lg:grid-cols-3">
      {featureFlagItems.map((item) => {
        const enabled = Boolean(featureFlags?.[item.key])
        return (
          <label key={item.key} className="flex min-h-32 cursor-pointer flex-col justify-between rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-4">
            <span>
              <span className="flex items-center justify-between gap-3">
                <span className="font-medium">{item.label}</span>
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  checked={enabled}
                  disabled={!canManageIntegrations || updatePending}
                  onChange={(event) => onChange(item.key, event.target.checked)}
                />
              </span>
              <span className="mt-2 block text-sm text-[var(--color-muted-foreground)]">{item.description}</span>
            </span>
            <Badge variant={enabled ? 'success' : 'neutral'}>{enabled ? 'Enabled' : 'Disabled'}</Badge>
          </label>
        )
      })}
    </div>
  </section>
)

export const WebhooksSection = ({
  canManageAutomation,
  webhookName,
  webhookUrl,
  webhookEventsValue,
  createdWebhookSecret,
  webhooks,
  webhookLogs,
  createPending,
  updatePending,
  deletePending,
  onWebhookNameChange,
  onWebhookUrlChange,
  onWebhookEventToggle,
  onCreateWebhook,
  onWebhookStatus,
  onDeleteWebhook,
}: {
  canManageAutomation: boolean
  webhookName: string
  webhookUrl: string
  webhookEventsValue: string[]
  createdWebhookSecret: string | null
  webhooks: OpenKbWebhook[]
  webhookLogs: OpenKbWebhookLog[]
  createPending: boolean
  updatePending: boolean
  deletePending: boolean
  onWebhookNameChange: (value: string) => void
  onWebhookUrlChange: (value: string) => void
  onWebhookEventToggle: (eventName: string, enabled: boolean) => void
  onCreateWebhook: () => void
  onWebhookStatus: (webhookId: string, status: OpenKbWebhookStatus) => void
  onDeleteWebhook: (webhookId: string) => void
}) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-2">
        <Webhook className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-semibold">Webhooks</h2>
      </div>
      <Badge variant={canManageAutomation ? 'success' : 'neutral'}>Automation</Badge>
    </div>
    <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.78fr)_minmax(0,1.22fr)]">
      <div className="space-y-3">
        <Input
          value={webhookName}
          onChange={(event) => onWebhookNameChange(event.target.value)}
          placeholder="Issue event relay"
          disabled={!canManageAutomation}
        />
        <Input
          value={webhookUrl}
          onChange={(event) => onWebhookUrlChange(event.target.value)}
          placeholder="https://example.com/open-kb/webhook"
          disabled={!canManageAutomation}
        />
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
          <div className="mb-2 text-xs font-medium uppercase text-[var(--color-muted-foreground)]">Events</div>
          <div className="grid gap-2 sm:grid-cols-2">
            {webhookEvents.map((eventItem) => (
              <label key={eventItem.value} className="inline-flex items-center gap-2 text-sm">
                <input
                  type="checkbox"
                  className="h-4 w-4 accent-[var(--color-primary)]"
                  checked={webhookEventsValue.includes(eventItem.value)}
                  disabled={!canManageAutomation}
                  onChange={(event) => onWebhookEventToggle(eventItem.value, event.target.checked)}
                />
                {eventItem.label}
              </label>
            ))}
          </div>
        </div>
        <Button
          type="button"
          onClick={onCreateWebhook}
          disabled={!canManageAutomation || !webhookName.trim() || !webhookUrl.trim()}
          loading={createPending}
        >
          <Webhook className="h-4 w-4" />
          Create webhook
        </Button>
        {createdWebhookSecret ? (
          <SecretCopyPanel label="Signing secret" secret={createdWebhookSecret} copiedLabel="Webhook secret copied" />
        ) : null}
      </div>

      <div className="space-y-4">
        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)]">
          {webhooks.length === 0 ? (
            <EmptyState title="No webhooks" description="" />
          ) : (
            <div className="divide-y divide-[var(--color-border)]">
              {webhooks.map((webhook) => (
                <div key={webhook.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                  <div className="min-w-0">
                    <div className="truncate text-sm font-medium">{webhook.name}</div>
                    <div className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">{webhook.url}</div>
                    <div className="mt-1 text-xs text-[var(--color-muted-foreground)]">{webhook.events.join(', ')}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Badge variant={webhook.status === 'active' ? 'success' : 'neutral'}>{webhook.status}</Badge>
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={!canManageAutomation || updatePending}
                      onClick={() => onWebhookStatus(webhook.id, webhook.status === 'active' ? 'paused' : 'active')}
                    >
                      {webhook.status === 'active' ? 'Pause' : 'Activate'}
                    </Button>
                    <Button
                      type="button"
                      size="icon"
                      variant="ghost"
                      aria-label="Remove webhook"
                      disabled={!canManageAutomation || deletePending}
                      onClick={() => onDeleteWebhook(webhook.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-3 py-2">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Activity className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              Delivery logs
            </div>
            <Badge variant="outline">{webhookLogs.length}</Badge>
          </div>
          {webhookLogs.length === 0 ? (
            <EmptyState title="No delivery logs" description="" />
          ) : (
            <div className="max-h-96 divide-y divide-[var(--color-border)] overflow-y-auto">
              {webhookLogs.map((log) => (
                <div key={log.id} className="grid gap-2 p-3 text-sm md:grid-cols-[minmax(0,1fr)_8rem_8rem] md:items-center">
                  <div className="min-w-0">
                    <div className="truncate font-medium">{log.webhook?.name ?? log.name ?? 'Webhook delivery'}</div>
                    <div className="mt-1 truncate text-xs text-[var(--color-muted-foreground)]">{log.webhook?.url ?? log.external_id ?? 'No endpoint recorded'}</div>
                  </div>
                  <Badge variant={log.status === 'success' ? 'success' : log.status === 'failed' ? 'danger' : 'neutral'}>
                    {log.http_status ?? log.status ?? 'pending'}
                  </Badge>
                  <div className="text-xs text-[var(--color-muted-foreground)]">
                    <div>{log.created_at.slice(0, 10)}</div>
                    <div>{log.attempt_count} attempt{log.attempt_count === 1 ? '' : 's'}</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  </section>
)

export const ApiTokensSection = ({
  featureFlags,
  canManageAutomation,
  tokenName,
  tokenScope,
  tokenExpiryDays,
  createdToken,
  apiTokens,
  createPending,
  revokePending,
  onTokenNameChange,
  onTokenScopeChange,
  onTokenExpiryDaysChange,
  onCreateToken,
  onRevokeToken,
}: {
  featureFlags: FeatureFlags | undefined
  canManageAutomation: boolean
  tokenName: string
  tokenScope: string
  tokenExpiryDays: string
  createdToken: string | null
  apiTokens: OpenKbApiToken[]
  createPending: boolean
  revokePending: boolean
  onTokenNameChange: (value: string) => void
  onTokenScopeChange: (value: string) => void
  onTokenExpiryDaysChange: (value: string) => void
  onCreateToken: () => void
  onRevokeToken: (tokenId: string) => void
}) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-2">
        <KeyRound className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-semibold">API tokens</h2>
      </div>
      <Badge variant={featureFlags?.api_tokens_enabled ? 'success' : 'neutral'}>
        {featureFlags?.api_tokens_enabled ? 'Enabled' : 'Feature flag off'}
      </Badge>
    </div>
    <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,0.75fr)_minmax(0,1.25fr)]">
      <div className="space-y-3">
        <Input
          value={tokenName}
          onChange={(event) => onTokenNameChange(event.target.value)}
          placeholder="Release automation"
          disabled={!featureFlags?.api_tokens_enabled || !canManageAutomation}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <Select
            aria-label="API token scope"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={tokenScope}
            onChange={(event) => onTokenScopeChange(event.target.value)}
            disabled={!featureFlags?.api_tokens_enabled || !canManageAutomation}
            options={tokenScopes}
          />
          <Select
            aria-label="API token expiry"
            className="border border-[var(--color-border)] bg-[var(--color-background)]"
            value={tokenExpiryDays}
            onChange={(event) => onTokenExpiryDaysChange(event.target.value)}
            disabled={!featureFlags?.api_tokens_enabled || !canManageAutomation}
            options={[
              { value: '30', label: '30 days' },
              { value: '90', label: '90 days' },
              { value: '365', label: '1 year' },
              { value: '0', label: 'No expiry' },
            ]}
          />
        </div>
        <Button
          type="button"
          onClick={onCreateToken}
          disabled={!featureFlags?.api_tokens_enabled || !canManageAutomation || !tokenName.trim()}
          loading={createPending}
        >
          <KeyRound className="h-4 w-4" />
          Create token
        </Button>
        {createdToken ? <SecretCopyPanel label="Copy now" secret={createdToken} copiedLabel="Token copied" /> : null}
      </div>
      <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)]">
        {apiTokens.length === 0 ? (
          <EmptyState title="No API tokens" description="" />
        ) : (
          <div className="divide-y divide-[var(--color-border)]">
            {apiTokens.map((token) => (
              <div key={token.id} className="flex flex-wrap items-center justify-between gap-3 p-3">
                <div className="min-w-0">
                  <div className="truncate text-sm font-medium">{token.name}</div>
                  <div className="mt-1 flex flex-wrap items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
                    <span>{token.scopes.join(', ') || 'No scopes'}</span>
                    <span>Created {token.created_at.slice(0, 10)}</span>
                    {token.expires_at ? <span>Expires {token.expires_at.slice(0, 10)}</span> : <span>No expiry</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Badge variant={token.revoked_at ? 'neutral' : 'success'}>{token.revoked_at ? 'Revoked' : 'Active'}</Badge>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    aria-label="Revoke API token"
                    disabled={Boolean(token.revoked_at) || !canManageAutomation || revokePending}
                    onClick={() => onRevokeToken(token.id)}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  </section>
)

export const RolePermissionsSection = ({
  roles,
  groupedEntries,
  canManageRoles,
  setRolePermissionPending,
  onRolePermissionChange,
}: {
  roles: OpenKbRole[]
  groupedEntries: Array<[string, AppPermission[]]>
  canManageRoles: boolean
  setRolePermissionPending: boolean
  onRolePermissionChange: (role: OpenKbRole, permission: AppPermission, enabled: boolean) => void
}) => (
  <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
    <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--color-border)] px-4 py-3">
      <div className="flex items-center gap-2">
        <ShieldCheck className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-semibold">Role permissions</h2>
      </div>
      <Badge variant="outline">{roles.length} roles</Badge>
    </div>

    {roles.length === 0 ? (
      <EmptyState title="No Open-KB roles" description="" />
    ) : (
      <div className="overflow-x-auto">
        <div className="min-w-[52rem]">
          <div className="grid border-b border-[var(--color-border)] bg-[var(--color-muted)]" style={{ gridTemplateColumns: `minmax(18rem,1fr) repeat(${roles.length}, minmax(8rem,0.45fr))` }}>
            <div className="px-4 py-3 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">Permission</div>
            {roles.map((role) => (
              <div key={role.id} className="px-3 py-3 text-center text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                {role.name}
              </div>
            ))}
          </div>

          {groupedEntries.map(([group, permissions]) => (
            <div key={group}>
              <div className="border-b border-[var(--color-border)] bg-[var(--color-background)] px-4 py-2 text-xs font-semibold uppercase text-[var(--color-muted-foreground)]">
                {formatGroupLabel(group)}
              </div>
              {permissions.map((permission) => (
                <div
                  key={permission.code}
                  className="grid min-h-14 border-b border-[var(--color-border)]"
                  style={{ gridTemplateColumns: `minmax(18rem,1fr) repeat(${roles.length}, minmax(8rem,0.45fr))` }}
                >
                  <div className="min-w-0 px-4 py-3">
                    <div className="flex min-w-0 items-center gap-2">
                      <KeyRound className="h-3.5 w-3.5 shrink-0 text-[var(--color-muted-foreground)]" />
                      <span className="truncate text-sm font-medium">{permission.code}</span>
                    </div>
                    <div className="mt-1 line-clamp-1 text-xs text-[var(--color-muted-foreground)]">{permission.description}</div>
                  </div>
                  {roles.map((role) => {
                    const enabled = role.permission_codes.includes(permission.code)
                    const disabled = !canManageRoles || !roleCanToggle(role) || setRolePermissionPending
                    return (
                      <div key={`${role.id}:${permission.code}`} className="flex items-center justify-center px-3 py-3">
                        <button
                          type="button"
                          className={cn(
                            'inline-flex h-8 w-12 items-center justify-center rounded-[var(--radius-md)] border text-xs font-medium',
                            enabled
                              ? 'border-[var(--color-primary)] bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                              : 'border-[var(--color-border)] bg-[var(--color-background)] text-[var(--color-muted-foreground)]',
                            disabled ? 'cursor-not-allowed opacity-60' : 'hover:border-[var(--color-border-hover)]',
                          )}
                          disabled={disabled}
                          onClick={() => onRolePermissionChange(role, permission, !enabled)}
                        >
                          {enabled ? 'On' : 'Off'}
                        </button>
                      </div>
                    )
                  })}
                </div>
              ))}
            </div>
          ))}
        </div>
      </div>
    )}
  </section>
)

const SecretCopyPanel = ({
  label,
  secret,
  copiedLabel,
}: {
  label: string
  secret: string
  copiedLabel: string
}) => (
  <div className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3">
    <div className="text-xs font-medium uppercase text-[var(--color-muted-foreground)]">{label}</div>
    <div className="mt-2 flex items-center gap-2">
      <code className="min-w-0 flex-1 truncate rounded-[var(--radius-md)] bg-[var(--color-muted)] px-2 py-1 text-xs">{secret}</code>
      <Button
        type="button"
        size="icon"
        variant="outline"
        aria-label={`Copy ${label.toLowerCase()}`}
        onClick={() => {
          void navigator.clipboard.writeText(secret)
          toast.success(copiedLabel)
        }}
      >
        <Copy className="h-4 w-4" />
      </Button>
    </div>
  </div>
)
