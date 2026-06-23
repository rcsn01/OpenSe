import { Link } from 'react-router-dom'
import { Badge, Button, EmptyState } from '@repo/ui'
import { Bell, CheckCheck } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { toast } from 'sonner'
import { OpenKbPageShell } from '../components/OpenKbPageShell'
import { useOrganisation } from '../contexts/OrganisationContext'
import { getProjectIssuePath } from '../lib/projectRoutes'
import {
  useMarkAllNotificationsRead,
  useMarkNotificationRead,
  useNotificationPreference,
  useNotifications,
  useSetIssueNotificationsEnabled,
} from '../hooks/queries/useNotifications'

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))

export const NotificationsPage = () => {
  const { user } = useAuth()
  const { organisationId } = useOrganisation()
  const { data: notifications = [], isLoading } = useNotifications(organisationId, user?.id ?? null)
  const { data: notificationPreference, isLoading: preferenceLoading } = useNotificationPreference(organisationId, user?.id ?? null)
  const markRead = useMarkNotificationRead()
  const markAllRead = useMarkAllNotificationsRead()
  const setIssueNotificationsEnabled = useSetIssueNotificationsEnabled()
  const unreadCount = notifications.filter((notification) => notification.status !== 'read').length
  const issueNotificationsEnabled = notificationPreference?.payload?.issue_notifications_enabled ?? true

  const handleMarkRead = async (notificationId: string) => {
    if (!organisationId) return

    try {
      await markRead.mutateAsync({ organisationId, notificationId })
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notification')
    }
  }

  const handleMarkAllRead = async () => {
    if (!organisationId || !user) return

    try {
      await markAllRead.mutateAsync({ organisationId, profileId: user.id })
      toast.success('Notifications marked read')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notifications')
    }
  }

  const handleIssueNotificationsChange = async (enabled: boolean) => {
    if (!organisationId || !user) return

    try {
      await setIssueNotificationsEnabled.mutateAsync({
        organisationId,
        profileId: user.id,
        enabled,
      })
      toast.success(enabled ? 'Issue notifications enabled' : 'Issue notifications muted')
    } catch (error) {
      toast.error(error instanceof Error ? error.message : 'Failed to update notification preferences')
    }
  }

  return (
    <OpenKbPageShell isLoading={isLoading || preferenceLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Notifications</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">Issue updates from watched Open-KB work.</p>
        </div>
        <Button type="button" variant="outline" onClick={handleMarkAllRead} disabled={unreadCount === 0} loading={markAllRead.isPending}>
          <CheckCheck className="h-4 w-4" />
          Mark all read
        </Button>
      </div>

      <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-4">
        <label className="flex flex-wrap items-center justify-between gap-4">
          <span>
            <span className="text-sm font-semibold">Issue notifications</span>
            <span className="mt-1 block text-sm text-[var(--color-muted-foreground)]">
              Receive inbox updates when watched issues change.
            </span>
          </span>
          <span className="flex items-center gap-3">
            <Badge variant={issueNotificationsEnabled ? 'success' : 'neutral'}>
              {issueNotificationsEnabled ? 'Enabled' : 'Muted'}
            </Badge>
            <input
              type="checkbox"
              className="h-4 w-4 accent-[var(--color-primary)]"
              checked={issueNotificationsEnabled}
              disabled={setIssueNotificationsEnabled.isPending}
              onChange={(event) => handleIssueNotificationsChange(event.target.checked)}
            />
          </span>
        </label>
      </section>

      {notifications.length === 0 ? (
        <EmptyState title="No notifications" description="Watch an issue to receive updates here." />
      ) : (
        <div className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
          <div className="flex items-center justify-between border-b border-[var(--color-border)] px-4 py-3">
            <div className="inline-flex items-center gap-2 text-sm font-semibold">
              <Bell className="h-4 w-4 text-[var(--color-muted-foreground)]" />
              Inbox
            </div>
            <Badge variant={unreadCount > 0 ? 'warning' : 'neutral'}>{unreadCount} unread</Badge>
          </div>
          <div className="divide-y divide-[var(--color-border)]">
            {notifications.map((notification) => {
              const isUnread = notification.status !== 'read'
              const target = notification.issue_id ?? notification.payload?.issue_id
              const content = (
                <div className="grid gap-1">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        {isUnread ? <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--color-primary)]" /> : null}
                        <span className="truncate text-sm font-medium">{notification.title ?? notification.name ?? 'Notification'}</span>
                      </div>
                      {notification.description_text ? (
                        <p className="mt-1 line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{notification.description_text}</p>
                      ) : null}
                    </div>
                    <time className="shrink-0 text-xs text-[var(--color-muted-foreground)]" dateTime={notification.created_at}>
                      {formatDateTime(notification.created_at)}
                    </time>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    {notification.name ? <Badge variant="outline">{notification.name.replace('.', ' ')}</Badge> : null}
                    {isUnread ? (
                      <Button
                        type="button"
                        variant="ghost"
                        className="h-7 px-2 text-xs"
                        onClick={(event) => {
                          event.preventDefault()
                          handleMarkRead(notification.id)
                        }}
                        loading={markRead.isPending}
                      >
                        Mark read
                      </Button>
                    ) : null}
                  </div>
                </div>
              )

              const issueId = target
              const projectId = notification.project_id ?? notification.payload?.project_id
              const issueHref = issueId && projectId ? getProjectIssuePath(projectId, issueId) : null

              return issueHref ? (
                <Link key={notification.id} to={issueHref} className="block px-4 py-3 hover:bg-[var(--color-muted)]">
                  {content}
                </Link>
              ) : (
                <div key={notification.id} className="px-4 py-3">
                  {content}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </OpenKbPageShell>
  )
}
