import { Link } from 'react-router-dom'
import { Button, cn } from '@repo/ui'
import { CalendarDays, Circle, MoreHorizontal, Plus, Tag, Users } from 'lucide-react'
import type { CycleDetailModel } from './cycleDetailModel'
import { getCycleDateBounds } from './cycleDetailModel'
import { dayKey, formatShortDate } from '../../lib/dateFormatting'
import { formatIssueKey } from '../../lib/issueFormatting'
import { getProjectIssuePath } from '../../lib/projectRoutes'

export const CycleProgressRing = ({ progress, size = 28 }: { progress: number; size?: number }) => (
  <span
    className="inline-grid shrink-0 place-items-center rounded-full"
    style={{
      width: size,
      height: size,
      background: `conic-gradient(#16a34a 0 ${progress}%, #e5e7eb ${progress}% 100%)`,
    }}
  >
    <span
      className="rounded-full bg-[var(--color-background)]"
      style={{
        width: Math.max(8, size - 8),
        height: Math.max(8, size - 8),
      }}
    />
  </span>
)

const CycleBreakdownPanel = ({ model, compact = false }: { model: CycleDetailModel; compact?: boolean }) => (
  <aside className={cn('w-full shrink-0 border-b border-[var(--color-border)] p-6 xl:w-80 xl:border-b-0 xl:border-r', compact && 'p-5')}>
    <div className="text-sm text-[var(--color-muted-foreground)]">Breakdown of this cycle&apos;s work items</div>
    <div className={cn('mt-6 font-semibold text-emerald-700', compact ? 'text-lg' : 'text-2xl')}>Leading by 0 work items</div>
    <div className={cn('space-y-6', compact ? 'mt-7 text-sm' : 'mt-10 text-base')}>
      <div className="flex items-center justify-between">
        <span>Today&apos;s ideal Pending</span>
        <span className="font-semibold">{model.pending}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-3"><span className="h-0.5 w-4 bg-[#22c55e]" />Pending</span>
        <span className="rounded-[var(--radius-sm)] bg-[#22c55e] px-2 py-1 text-sm font-semibold text-white">{model.pending}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-3"><span className="h-0.5 w-4 bg-[#f59e0b]" />Started</span>
        <span className="rounded-[var(--radius-sm)] bg-[#f59e0b] px-2 py-1 text-sm font-semibold text-white">{model.started}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-3"><span className="h-0.5 w-4 bg-[#0284c7]" />Scope</span>
        <span className="font-semibold">{model.total}</span>
      </div>
    </div>
    <div className={cn('border-t border-[var(--color-border)]', compact ? 'my-7' : 'my-10')} />
    <div className={cn('space-y-6', compact ? 'text-sm' : 'text-base')}>
      <div className="text-sm text-[var(--color-muted-foreground)]">Other stategroups</div>
      <div className="flex items-center justify-between"><span>Done</span><span className="font-semibold">{model.completed}</span></div>
      <div className="flex items-center justify-between"><span>Unstarted</span><span className="font-semibold">{Math.max(0, model.pending - model.started)}</span></div>
      <div className="flex items-center justify-between"><span>Backlog</span><span className="font-semibold">{model.backlog}</span></div>
    </div>
    <div className={cn('border-t border-[var(--color-border)] text-sm text-[var(--color-muted-foreground)]', compact ? 'mt-8 pt-3' : 'mt-10 pt-5')}>
      Excluded 0 cancelled work items
    </div>
  </aside>
)

const CycleBurndownPanel = ({ model, compact = false }: { model: CycleDetailModel; compact?: boolean }) => {
  const { start, end } = getCycleDateBounds(model.cycle)
  const today = new Date()
  today.setHours(0, 0, 0, 0)
  const total = Math.max(1, model.total)
  const pendingY = Math.max(0.8, model.pending)
  const startedY = Math.max(0.2, model.started)
  const midpointX = Math.min(72, Math.max(14, ((today.getTime() - start.getTime()) / Math.max(1, end.getTime() - start.getTime())) * 100))
  const gridId = `cycle-grid-${model.cycle.id}`
  const hatchId = `cycle-hatch-${model.cycle.id}`

  return (
    <section className={cn('relative flex-1 overflow-hidden px-6 pb-12 pt-6', compact ? 'min-h-[24rem]' : 'min-h-[30rem]')}>
      <div className={cn('flex items-center gap-3', compact ? 'mb-8 text-sm' : 'mb-10 text-lg')}>
        <Button type="button" variant="ghost" size="sm" className={cn('bg-[var(--color-muted)]', compact ? 'h-8 px-3' : 'h-10 px-4 text-base')}>Burn-down</Button>
        <span className="text-[var(--color-muted-foreground)]">for</span>
        <span className="font-semibold">Work Items</span>
      </div>
      <svg className={cn('w-full overflow-visible', compact ? 'h-[20rem]' : 'h-[22rem]')} viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id={gridId} width="100" height="25" patternUnits="userSpaceOnUse">
            <path d="M 0 25 H 100" stroke="rgba(100,116,139,0.18)" strokeWidth="0.35" />
          </pattern>
          <pattern id={hatchId} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(59,130,246,0.07)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="5" y="5" width="92" height="78" fill={`url(#${hatchId})`} />
        <rect x="5" y="5" width="92" height="78" fill={`url(#${gridId})`} />
        <line x1="5" y1="5" x2="97" y2="5" stroke="#0284c7" strokeWidth="0.7" />
        <line x1="5" y1="83" x2="97" y2="83" stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1="5" y1="5" x2="5" y2="83" stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1="5" y1="5" x2="97" y2="83" stroke="#93c5fd" strokeWidth="0.35" strokeDasharray="2 2" />
        <line x1={midpointX} y1="5" x2={midpointX} y2="83" stroke="#111827" strokeWidth="0.4" strokeDasharray="2 1" />
        <polyline points={`5,${83 - (pendingY / total) * 58} ${midpointX},${83 - (pendingY / total) * 58}`} fill="none" stroke="#22c55e" strokeWidth="0.9" />
        <polyline points={`5,${83 - (startedY / total) * 58} ${midpointX},${83 - (startedY / total) * 58}`} fill="none" stroke="#f59e0b" strokeWidth="0.65" />
      </svg>
      <div className="absolute bottom-5 left-8 right-8 flex justify-between text-sm text-[var(--color-muted-foreground)]">
        <span>{formatShortDate(dayKey(start))}<br />Start</span>
        <span>{formatShortDate(dayKey(today))}</span>
        <span className="text-right">{formatShortDate(dayKey(end))}<br />End</span>
      </div>
      <div className="absolute left-3 top-44 -rotate-90 text-xs font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">Work items</div>
    </section>
  )
}

const CycleWorkItemsSection = ({ model, onCreateIssue }: { model: CycleDetailModel; onCreateIssue?: () => void }) => (
  <section className="border-t border-[var(--color-border)]">
    <div className="flex h-12 items-center justify-between border-b border-[var(--color-border)] px-6">
      <div className="inline-flex items-center gap-2 text-base font-semibold">
        <CycleProgressRing progress={model.progress} size={16} />
        All work items
        <span className="text-[var(--color-muted-foreground)]">{model.issues.length}</span>
      </div>
      <Plus className="h-4 w-4 text-[var(--color-muted-foreground)]" />
    </div>
    <div className="divide-y divide-[var(--color-border)]">
      {model.issues.map((issue) => (
        <Link key={issue.id} to={getProjectIssuePath(model.cycle.project_id, issue.id)} className="grid min-h-12 grid-cols-[6rem_minmax(12rem,1fr)_auto] items-center gap-3 px-6 text-sm hover:bg-[var(--color-muted)]">
          <span className="text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span>
          <span className="min-w-0 truncate font-medium">{issue.title}</span>
          <div className="flex min-w-0 items-center gap-2 overflow-hidden">
            <span className="inline-flex h-6 max-w-32 items-center gap-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)]">
              <Circle className="h-3 w-3" style={{ color: issue.state?.color ?? '#64748b' }} />
              <span className="truncate">{issue.state?.name ?? 'No status'}</span>
            </span>
            <span className="hidden h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] md:inline-flex">
              <CalendarDays className="h-3 w-3" />
            </span>
            <span className="hidden h-6 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] lg:inline-flex">
              <Users className="h-3 w-3" />
            </span>
            <span className="hidden h-6 max-w-40 items-center gap-1 truncate rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] xl:inline-flex">
              <Circle className="h-3 w-3" />
              <span className="truncate">{model.cycle.name}</span>
            </span>
            <span className="hidden h-6 items-center rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 text-xs text-[var(--color-muted-foreground)] xl:inline-flex">
              <Tag className="h-3 w-3" />
            </span>
            <MoreHorizontal className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          </div>
        </Link>
      ))}
      {onCreateIssue ? (
        <button type="button" onClick={onCreateIssue} className="flex h-12 w-full items-center gap-2 px-6 text-sm hover:bg-[var(--color-muted)]">
          <Plus className="h-4 w-4" />
          New work item
        </button>
      ) : null}
    </div>
  </section>
)

export const CycleDetailContent = ({
  model,
  onCreateIssue,
  compact = false,
  showWorkItems = true,
}: {
  model: CycleDetailModel
  onCreateIssue?: () => void
  compact?: boolean
  showWorkItems?: boolean
}) => (
  <div className="min-h-full">
    <div className="flex min-h-full flex-col xl:flex-row">
      <CycleBreakdownPanel model={model} compact={compact} />
      <CycleBurndownPanel model={model} compact={compact} />
    </div>
    {showWorkItems ? <CycleWorkItemsSection model={model} onCreateIssue={onCreateIssue} /> : null}
  </div>
)
