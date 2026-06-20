import { Link } from 'react-router-dom'
import { Badge, Button, cn } from '@repo/ui'
import type { Issue, IssueState } from '../../types'
import { buildCalendarDays, dayKey, formatShortDate, toDate } from '../../lib/dateFormatting'
import { formatIssueKey, issuePriorityTone as priorityTone } from '../../lib/issueFormatting'

export const IssueRow = ({
  issue,
  selected,
  onToggle,
}: {
  issue: Issue
  selected: boolean
  onToggle: (issueId: string) => void
}) => (
  <div className="grid min-h-14 grid-cols-[2rem_minmax(96px,0.35fr)_minmax(220px,1.5fr)_minmax(120px,0.5fr)_minmax(120px,0.5fr)_minmax(140px,0.6fr)] items-center gap-3 border-b border-[var(--color-border)] px-3 py-2 text-sm hover:bg-[var(--color-muted)]">
    <input
      type="checkbox"
      className="h-4 w-4 rounded border-[var(--color-border)]"
      checked={selected}
      onChange={() => onToggle(issue.id)}
      aria-label={`Select ${formatIssueKey(issue)}`}
    />
    <Link to={`/issues/${issue.id}`} className="font-mono text-xs text-[var(--color-muted-foreground)] hover:underline">{formatIssueKey(issue)}</Link>
    <Link to={`/issues/${issue.id}`} className="min-w-0 truncate font-medium hover:underline">{issue.title}</Link>
    <span className="min-w-0 truncate text-[var(--color-muted-foreground)]">{issue.project?.name ?? 'Unknown project'}</span>
    <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge>
    <span className="inline-flex min-w-0 items-center gap-2 text-[var(--color-muted-foreground)]">
      <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: issue.state?.color ?? '#64748b' }} />
      <span className="truncate">{issue.state?.name ?? 'No state'}</span>
    </span>
  </div>
)

export const IssueCard = ({ issue }: { issue: Issue }) => (
  <Link
    to={`/issues/${issue.id}`}
    className="block rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] p-3 text-sm hover:border-[var(--color-border-hover)]"
  >
    <div className="flex items-center justify-between gap-3">
      <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
      <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge>
    </div>
    <h3 className="mt-3 line-clamp-2 font-medium">{issue.title}</h3>
    <p className="mt-2 line-clamp-2 min-h-10 text-xs text-[var(--color-muted-foreground)]">
      {issue.description_text || issue.project?.name || 'No description.'}
    </p>
  </Link>
)

export const IssueTable = ({
  issues,
  selectedIssueIds,
  onToggle,
}: {
  issues: Issue[]
  selectedIssueIds: Set<string>
  onToggle: (issueId: string) => void
}) => (
  <div className="overflow-x-auto rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
    <table className="min-w-[980px] w-full border-collapse text-sm">
      <thead className="bg-[var(--color-muted)] text-left text-xs font-medium uppercase text-[var(--color-muted-foreground)]">
        <tr>
          <th className="w-10 px-3 py-2"></th>
          <th className="px-3 py-2">Key</th>
          <th className="px-3 py-2">Title</th>
          <th className="px-3 py-2">Project</th>
          <th className="px-3 py-2">State</th>
          <th className="px-3 py-2">Priority</th>
          <th className="px-3 py-2">Start</th>
          <th className="px-3 py-2">Target</th>
          <th className="px-3 py-2">Updated</th>
        </tr>
      </thead>
      <tbody className="divide-y divide-[var(--color-border)]">
        {issues.map((issue) => (
          <tr key={issue.id} className="hover:bg-[var(--color-muted)]">
            <td className="px-3 py-2">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border-[var(--color-border)]"
                checked={selectedIssueIds.has(issue.id)}
                onChange={() => onToggle(issue.id)}
                aria-label={`Select ${formatIssueKey(issue)}`}
              />
            </td>
            <td className="whitespace-nowrap px-3 py-2 font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</td>
            <td className="max-w-[28rem] px-3 py-2">
              <Link to={`/issues/${issue.id}`} className="block truncate font-medium hover:underline">{issue.title}</Link>
            </td>
            <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted-foreground)]">{issue.project?.name ?? 'Unknown project'}</td>
            <td className="px-3 py-2">
              <span className="inline-flex min-w-0 items-center gap-2">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ backgroundColor: issue.state?.color ?? '#64748b' }} />
                <span className="truncate">{issue.state?.name ?? 'No state'}</span>
              </span>
            </td>
            <td className="px-3 py-2"><Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge></td>
            <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted-foreground)]">{formatShortDate(issue.start_date)}</td>
            <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted-foreground)]">{formatShortDate(issue.target_date)}</td>
            <td className="whitespace-nowrap px-3 py-2 text-[var(--color-muted-foreground)]">{formatShortDate((issue.updated_at ?? issue.created_at).slice(0, 10))}</td>
          </tr>
        ))}
      </tbody>
    </table>
  </div>
)

export const IssueCalendar = ({
  issues,
  month,
  onMonthChange,
}: {
  issues: Issue[]
  month: Date
  onMonthChange: (date: Date) => void
}) => {
  const days = buildCalendarDays(month)
  const monthLabel = new Intl.DateTimeFormat(undefined, { month: 'long', year: 'numeric' }).format(month)

  return (
    <section className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-4">
        <Button type="button" variant="ghost" size="sm" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() - 1, 1))}>Previous</Button>
        <h2 className="text-sm font-semibold">{monthLabel}</h2>
        <Button type="button" variant="ghost" size="sm" onClick={() => onMonthChange(new Date(month.getFullYear(), month.getMonth() + 1, 1))}>Next</Button>
      </div>
      <div className="grid grid-cols-7 border-b border-[var(--color-border)] bg-[var(--color-muted)] text-center text-xs font-medium uppercase text-[var(--color-muted-foreground)]">
        {['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'].map((day) => <div key={day} className="px-2 py-2">{day}</div>)}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = dayKey(day)
          const dayIssues = issues.filter((issue) => (issue.target_date || issue.start_date) === key)
          const inMonth = day.getMonth() === month.getMonth()

          return (
            <div key={key} className={cn('min-h-32 border-b border-r border-[var(--color-border)] p-2', !inMonth && 'bg-[var(--color-muted)]/40 text-[var(--color-muted-foreground)]')}>
              <div className="mb-2 text-xs font-medium">{day.getDate()}</div>
              <div className="space-y-1">
                {dayIssues.slice(0, 4).map((issue) => (
                  <Link key={issue.id} to={`/issues/${issue.id}`} className="block rounded-[var(--radius-sm)] border border-[var(--color-border)] bg-[var(--color-background)] px-2 py-1 text-xs hover:border-[var(--color-border-hover)]">
                    <span className="block truncate font-medium">{issue.title}</span>
                    <span className="text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
                  </Link>
                ))}
                {dayIssues.length > 4 ? <div className="text-xs text-[var(--color-muted-foreground)]">+{dayIssues.length - 4} more</div> : null}
              </div>
            </div>
          )
        })}
      </div>
    </section>
  )
}

export const IssueGantt = ({ issues }: { issues: Issue[] }) => {
  const ranges = issues.map((issue) => {
    const start = toDate(issue.start_date) ?? toDate(issue.created_at.slice(0, 10)) ?? new Date()
    const end = toDate(issue.target_date) ?? start
    return { issue, start, end: end < start ? start : end }
  })
  const minTime = Math.min(...ranges.map((range) => range.start.getTime()))
  const maxTime = Math.max(...ranges.map((range) => range.end.getTime()))
  const totalDays = Math.max(1, Math.ceil((maxTime - minTime) / 86_400_000) + 1)
  const rangeStart = new Date(minTime)
  const rangeEnd = new Date(maxTime)

  return (
    <section className="overflow-hidden rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
      <div className="grid grid-cols-[minmax(14rem,18rem)_minmax(24rem,1fr)] border-b border-[var(--color-border)] bg-[var(--color-muted)] text-xs font-medium uppercase text-[var(--color-muted-foreground)]">
        <div className="px-3 py-2">Issue</div>
        <div className="flex items-center justify-between px-3 py-2">
          <span>{formatShortDate(dayKey(rangeStart))}</span>
          <span>{totalDays} days</span>
          <span>{formatShortDate(dayKey(rangeEnd))}</span>
        </div>
      </div>
      <div className="divide-y divide-[var(--color-border)]">
        {ranges.map(({ issue, start, end }) => {
          const left = Math.max(0, ((start.getTime() - minTime) / 86_400_000 / totalDays) * 100)
          const width = Math.max(2, ((end.getTime() - start.getTime()) / 86_400_000 + 1) / totalDays * 100)

          return (
            <Link key={issue.id} to={`/issues/${issue.id}`} className="grid min-h-14 grid-cols-[minmax(14rem,18rem)_minmax(24rem,1fr)] items-center hover:bg-[var(--color-muted)]">
              <div className="min-w-0 px-3">
                <div className="truncate text-sm font-medium">{issue.title}</div>
                <div className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</div>
              </div>
              <div className="relative h-8 px-3">
                <div className="absolute left-3 right-3 top-1/2 h-1 -translate-y-1/2 rounded-full bg-[var(--color-border)]" />
                <div
                  className="absolute top-1/2 h-4 -translate-y-1/2 rounded-full bg-[var(--color-primary)]"
                  style={{ left: `calc(0.75rem + ${left}%)`, width: `calc(${width}% - 0.25rem)` }}
                />
              </div>
            </Link>
          )
        })}
      </div>
    </section>
  )
}

export const buildBoardColumns = (states: IssueState[], issues: Issue[]) => {
  const columns = states.map((state) => ({
    id: state.id,
    title: state.name,
    color: state.color,
    issues: issues.filter((issue) => issue.state_id === state.id),
  }))
  const uncategorised = issues.filter((issue) => !issue.state_id)

  if (uncategorised.length > 0) {
    columns.unshift({
      id: 'none',
      title: 'No state',
      color: '#64748b',
      issues: uncategorised,
    })
  }

  return columns
}
