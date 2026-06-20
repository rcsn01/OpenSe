import { Badge } from '@repo/ui'
import { Activity } from 'lucide-react'
import type { IssueActivity } from '../../types'
import { formatDateTime } from '../../lib/dateFormatting'
import { formatProfileName } from '../../lib/profileFormatting'

export const IssueActivitySection = ({
  activities,
  isLoading,
}: {
  activities: IssueActivity[]
  isLoading: boolean
}) => (
  <section className="space-y-4 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)] p-5">
    <div className="flex items-center justify-between gap-3">
      <div className="inline-flex items-center gap-2">
        <Activity className="h-4 w-4 text-[var(--color-muted-foreground)]" />
        <h2 className="text-sm font-semibold">Activity</h2>
      </div>
      <Badge variant="neutral">{activities.length}</Badge>
    </div>

    {isLoading ? (
      <p className="text-sm text-[var(--color-muted-foreground)]">Loading activity...</p>
    ) : activities.length === 0 ? (
      <p className="text-sm text-[var(--color-muted-foreground)]">No activity yet.</p>
    ) : (
      <div className="divide-y divide-[var(--color-border)] rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)]">
        {activities.map((activityItem) => (
          <article key={activityItem.id} className="grid gap-1 px-4 py-3">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="min-w-0">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="text-sm font-medium">{activityItem.title ?? activityItem.name ?? 'Issue activity'}</span>
                  {activityItem.name ? <Badge variant="outline">{activityItem.name.replace('.', ' ')}</Badge> : null}
                </div>
                <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                  {formatProfileName(activityItem.actor_profile)}
                </p>
              </div>
              <time className="shrink-0 text-xs text-[var(--color-muted-foreground)]" dateTime={activityItem.created_at}>
                {formatDateTime(activityItem.created_at)}
              </time>
            </div>
            {activityItem.description_text ? (
              <p className="line-clamp-2 text-sm text-[var(--color-muted-foreground)]">{activityItem.description_text}</p>
            ) : null}
          </article>
        ))}
      </div>
    )}
  </section>
)
