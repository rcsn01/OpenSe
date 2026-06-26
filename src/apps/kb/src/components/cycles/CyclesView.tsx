import { useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { Button, EmptyState, cn } from '@repo/ui'
import { CalendarDays, ChevronDown, ChevronRight, Circle, Info, ListFilter, MoreHorizontal, Plus, Search, Tag, Users } from 'lucide-react'
import type { Cycle, CycleIssueLink, Issue } from '../../types'
import { dayKey, formatShortDate, toDate } from '../../lib/dateFormatting'
import { formatIssueKey } from '../../lib/issueFormatting'
import { getProjectIssuePath } from '../../lib/projectRoutes'

type CycleTab = 'active' | 'upcoming' | 'completed'

type CycleViewModel = {
  cycle: Cycle
  issues: Issue[]
  total: number
  completed: number
  pending: number
  started: number
  backlog: number
  progress: number
}

const tabs: Array<{ id: CycleTab; label: string }> = [
  { id: 'active', label: 'Active' },
  { id: 'upcoming', label: 'Upcoming' },
  { id: 'completed', label: 'Completed' },
]

const today = () => {
  const now = new Date()
  now.setHours(0, 0, 0, 0)
  return now
}

const classifyCycle = (cycle: Cycle): CycleTab => {
  if (cycle.status === 'completed') return 'completed'
  const start = toDate(cycle.starts_at)
  if (cycle.status === 'draft' || (start && start > today())) return 'upcoming'
  return 'active'
}

const formatCycleDateRange = (cycle: Cycle) => {
  if (!cycle.starts_at && !cycle.ends_at) return 'No dates'
  const start = cycle.starts_at ? formatShortDate(cycle.starts_at) : 'No start'
  const end = cycle.ends_at ? formatShortDate(cycle.ends_at) : 'No end'
  return `${start} - ${end}`
}

const progressStyle = (progress: number, size = 18) => ({
  width: size,
  height: size,
  background: `conic-gradient(#16a34a 0 ${progress}%, #e5e7eb ${progress}% 100%)`,
})

const isIssueDone = (issue: Issue) => Boolean(issue.completed_at || issue.state?.group_key === 'completed' || issue.state?.name?.toLowerCase().includes('done') || issue.state?.name?.toLowerCase().includes('resolved'))
const isIssueStarted = (issue: Issue) => ['started', 'in_progress'].includes(issue.state?.group_key ?? '') || ['in progress', 'investigating'].includes(issue.state?.name?.toLowerCase() ?? '')

const buildCycleModels = (cycles: Cycle[], issues: Issue[], cycleIssueLinks: CycleIssueLink[]): CycleViewModel[] => {
  const issueById = new Map(issues.map((issue) => [issue.id, issue]))
  const issueIdsByCycle = new Map<string, Set<string>>()

  cycleIssueLinks.forEach((link) => {
    if (!link.cycle_id || !link.issue_id) return
    const set = issueIdsByCycle.get(link.cycle_id) ?? new Set<string>()
    set.add(link.issue_id)
    issueIdsByCycle.set(link.cycle_id, set)
  })

  return cycles.map((cycle) => {
    const linked = [...(issueIdsByCycle.get(cycle.id) ?? new Set<string>())]
      .map((issueId) => issueById.get(issueId))
      .filter((issue): issue is Issue => Boolean(issue))
    const completed = linked.filter(isIssueDone).length
    const started = linked.filter((issue) => !isIssueDone(issue) && isIssueStarted(issue)).length
    const pending = linked.filter((issue) => !isIssueDone(issue)).length
    const backlog = linked.filter((issue) => issue.state?.group_key === 'backlog').length
    const total = linked.length

    return {
      cycle,
      issues: linked,
      total,
      completed,
      pending,
      started,
      backlog,
      progress: total > 0 ? Math.round((completed / total) * 100) : 0,
    }
  })
}

const CycleProgressRing = ({ progress, size = 18 }: { progress: number; size?: number }) => (
  <span className="inline-grid shrink-0 place-items-center rounded-full" style={progressStyle(progress, size)}>
    <span className="rounded-full bg-[var(--color-background)]" style={{ width: Math.max(6, size - 6), height: Math.max(6, size - 6) }} />
  </span>
)

const CycleBurndown = ({ model }: { model: CycleViewModel }) => {
  const start = toDate(model.cycle.starts_at) ?? today()
  const end = toDate(model.cycle.ends_at) ?? new Date(start.getTime() + 14 * 86_400_000)
  const midpoint = today()
  const total = Math.max(1, model.total)
  const pendingY = Math.max(0.8, model.pending)
  const startedY = Math.max(0.2, model.started)
  const midpointX = Math.min(72, Math.max(14, ((midpoint.getTime() - start.getTime()) / Math.max(1, end.getTime() - start.getTime())) * 100))

  return (
    <div className="relative min-h-[22rem] flex-1 overflow-hidden px-6 pb-8 pt-5">
      <div className="mb-8 flex items-center gap-2 text-sm">
        <Button type="button" variant="ghost" size="sm" className="h-8 bg-[var(--color-muted)] px-3">Burn-down</Button>
        <span className="text-[var(--color-muted-foreground)]">for</span>
        <span className="font-medium">Work Items</span>
      </div>
      <svg className="h-[20rem] w-full overflow-visible" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden="true">
        <defs>
          <pattern id={`cycle-grid-${model.cycle.id}`} width="100" height="25" patternUnits="userSpaceOnUse">
            <path d="M 0 25 H 100" stroke="rgba(100,116,139,0.18)" strokeWidth="0.35" />
          </pattern>
          <pattern id={`cycle-hatch-${model.cycle.id}`} width="4" height="4" patternUnits="userSpaceOnUse" patternTransform="rotate(45)">
            <line x1="0" y1="0" x2="0" y2="4" stroke="rgba(59,130,246,0.07)" strokeWidth="1" />
          </pattern>
        </defs>
        <rect x="5" y="5" width="92" height="78" fill={`url(#cycle-hatch-${model.cycle.id})`} />
        <rect x="5" y="5" width="92" height="78" fill={`url(#cycle-grid-${model.cycle.id})`} />
        <line x1="5" y1="5" x2="97" y2="5" stroke="#0284c7" strokeWidth="0.7" />
        <line x1="5" y1="83" x2="97" y2="83" stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1="5" y1="5" x2="5" y2="83" stroke="#cbd5e1" strokeWidth="0.5" />
        <line x1="5" y1="5" x2="97" y2="83" stroke="#93c5fd" strokeWidth="0.35" strokeDasharray="2 2" />
        <line x1={midpointX} y1="5" x2={midpointX} y2="83" stroke="#111827" strokeWidth="0.4" strokeDasharray="2 1" />
        <polyline
          points={`5,${83 - (pendingY / total) * 58} ${midpointX},${83 - (pendingY / total) * 58}`}
          fill="none"
          stroke="#22c55e"
          strokeWidth="0.9"
        />
        <polyline
          points={`5,${83 - (startedY / total) * 58} ${midpointX},${83 - (startedY / total) * 58}`}
          fill="none"
          stroke="#f59e0b"
          strokeWidth="0.65"
        />
      </svg>
      <div className="absolute bottom-3 left-8 right-6 flex justify-between text-xs text-[var(--color-muted-foreground)]">
        <span>{formatShortDate(dayKey(start))}<br />Start</span>
        <span>{formatShortDate(dayKey(midpoint))}</span>
        <span>{formatShortDate(dayKey(end))}<br />End</span>
      </div>
      <div className="absolute left-2 top-32 -rotate-90 text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Work items</div>
    </div>
  )
}

const CycleSidebar = ({ model }: { model: CycleViewModel }) => (
  <aside className="w-full shrink-0 border-r border-[var(--color-border)] p-5 lg:w-80">
    <div className="text-xs text-[var(--color-muted-foreground)]">Breakdown of this cycle&apos;s work items</div>
    <div className="mt-3 text-lg font-semibold text-emerald-700">Leading by 0 work items</div>
    <div className="mt-7 space-y-4 text-sm">
      <div className="flex items-center justify-between">
        <span>Today&apos;s ideal Pending</span>
        <span className="font-semibold">{model.pending}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-3 bg-[#22c55e]" />Pending</span>
        <span className="rounded-[4px] bg-[#22c55e] px-1.5 py-0.5 text-xs font-semibold text-white">{model.pending}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-3 bg-[#f59e0b]" />Started</span>
        <span className="rounded-[4px] bg-[#f59e0b] px-1.5 py-0.5 text-xs font-semibold text-white">{model.started}</span>
      </div>
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2"><span className="h-0.5 w-3 bg-[#0284c7]" />Scope</span>
        <span className="font-semibold">{model.total}</span>
      </div>
    </div>
    <div className="my-7 border-t border-[var(--color-border)]" />
    <div className="space-y-4 text-sm">
      <div className="text-xs text-[var(--color-muted-foreground)]">Other stategroups</div>
      <div className="flex items-center justify-between"><span>Done</span><span className="font-semibold">{model.completed}</span></div>
      <div className="flex items-center justify-between"><span>Unstarted</span><span className="font-semibold">{Math.max(0, model.pending - model.started)}</span></div>
      <div className="flex items-center justify-between"><span>Backlog</span><span className="font-semibold">{model.backlog}</span></div>
    </div>
    <div className="mt-8 border-t border-[var(--color-border)] pt-3 text-xs text-[var(--color-muted-foreground)]">
      Excluded 0 cancelled work items
    </div>
  </aside>
)

const WorkItemsList = ({ model, onCreateIssue }: { model: CycleViewModel; onCreateIssue?: () => void }) => (
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
        <Link key={issue.id} to={getProjectIssuePath(model.cycle.project_id, issue.id)} className="grid min-h-12 grid-cols-[6rem_minmax(16rem,1fr)_auto] items-center gap-3 px-6 text-sm hover:bg-[var(--color-muted)]">
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

export const CyclesView = ({
  cycles,
  issues,
  cycleIssueLinks,
  newCycleHref,
  onCreateIssue,
  initialExpandedCycleId,
  className,
}: {
  cycles: Cycle[]
  issues: Issue[]
  cycleIssueLinks: CycleIssueLink[]
  newCycleHref: string
  onCreateIssue?: () => void
  initialExpandedCycleId?: string | null
  className?: string
}) => {
  const [activeTab, setActiveTab] = useState<CycleTab>('active')
  const [expandedCycleId, setExpandedCycleId] = useState<string | null>(null)
  const [hasManualSelection, setHasManualSelection] = useState(false)
  const models = useMemo(() => buildCycleModels(cycles, issues, cycleIssueLinks), [cycleIssueLinks, cycles, issues])
  const initialExpandedModel = !hasManualSelection && initialExpandedCycleId
    ? models.find((model) => model.cycle.id === initialExpandedCycleId) ?? null
    : null
  const visibleTab = initialExpandedModel ? classifyCycle(initialExpandedModel.cycle) : activeTab
  const visibleExpandedCycleId = initialExpandedModel?.cycle.id ?? expandedCycleId
  const visibleModels = models.filter((model) => classifyCycle(model.cycle) === visibleTab)
  const expandedModel = visibleModels.find((model) => model.cycle.id === (visibleExpandedCycleId ?? visibleModels[0]?.cycle.id))

  return (
    <section className={cn('flex min-h-0 flex-1 flex-col overflow-hidden bg-[var(--color-background)]', className)}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-5">
        <nav className="flex h-full items-end gap-3" aria-label="Cycle status">
          {tabs.map((tab) => (
            <button
              key={tab.id}
              type="button"
              className={cn(
                'h-10 border-b-2 px-2 text-sm font-medium transition-colors',
                visibleTab === tab.id
                  ? 'border-[var(--color-foreground)] bg-[var(--color-muted)] text-[var(--color-foreground)]'
                  : 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
              )}
              onClick={() => {
                setHasManualSelection(true)
                setActiveTab(tab.id)
                setExpandedCycleId(null)
              }}
            >
              {tab.label}
            </button>
          ))}
        </nav>
        <div className="flex items-center gap-3">
          <Search className="h-4 w-4 text-[var(--color-muted-foreground)]" />
          <Button type="button" variant="outline" size="sm" className="h-8 gap-2">
            <ListFilter className="h-4 w-4" />
            Filters
          </Button>
          <Link to={newCycleHref} className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] hover:bg-[var(--color-muted)]" aria-label="New cycle">
            <Plus className="h-4 w-4" />
          </Link>
        </div>
      </div>

      {visibleModels.length === 0 ? (
        <EmptyState title="No cycles found" description="Create a cycle to time-box project work." />
      ) : (
        <div className="min-h-0 flex-1 overflow-auto">
          <div className="divide-y divide-[var(--color-border)] border-b border-[var(--color-border)]">
            {visibleModels.map((model) => {
              const isExpanded = expandedModel?.cycle.id === model.cycle.id
              return (
                <button
                  key={model.cycle.id}
                  type="button"
                  className="grid h-12 w-full grid-cols-[minmax(0,1fr)_auto] items-center gap-4 px-6 text-left hover:bg-[var(--color-muted)]"
                  onClick={() => {
                    setHasManualSelection(true)
                    setExpandedCycleId(isExpanded ? null : model.cycle.id)
                  }}
                >
                  <span className="flex min-w-0 items-center gap-3">
                    {isExpanded ? <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" /> : <ChevronRight className="h-4 w-4 text-[var(--color-muted-foreground)]" />}
                    <CycleProgressRing progress={model.progress} />
                    <span className="min-w-0 truncate text-sm font-medium">{model.cycle.name}</span>
                  </span>
                  <span className="flex items-center gap-6 text-xs text-[var(--color-muted-foreground)]">
                    <span className="inline-flex items-center gap-2"><CycleProgressRing progress={model.progress} size={16} />{model.progress}% ({model.completed}/{model.total || 1})</span>
                    <span className="font-medium text-emerald-700">Leading 0</span>
                    <span className="hidden h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 lg:inline-flex">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {formatCycleDateRange(model.cycle)}
                    </span>
                    <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-[#006aa6] text-[10px] font-semibold text-white">P</span>
                    <MoreHorizontal className="h-4 w-4" />
                  </span>
                </button>
              )
            })}
          </div>

          {expandedModel ? (
            <article className="border-b border-[var(--color-border)]">
              <div className="flex h-20 items-center justify-between border-b border-[var(--color-border)] px-6">
                <div className="flex items-center gap-4">
                  <CycleProgressRing progress={expandedModel.progress} size={48} />
                  <h2 className="text-lg font-semibold">{expandedModel.cycle.name}</h2>
                </div>
                <div className="flex items-center gap-3 text-xs text-[var(--color-muted-foreground)]">
                  <Info className="h-4 w-4" />
                  <span className="hidden h-7 items-center gap-1 rounded-[var(--radius-sm)] border border-[var(--color-border)] px-2 md:inline-flex">
                    <CalendarDays className="h-3.5 w-3.5" />
                    {formatCycleDateRange(expandedModel.cycle)}
                  </span>
                  <span className="inline-grid h-6 w-6 place-items-center rounded-full bg-[#006aa6] text-[10px] font-semibold text-white">P</span>
                  <MoreHorizontal className="h-4 w-4" />
                </div>
              </div>
              <div className="flex flex-col lg:flex-row">
                <CycleSidebar model={expandedModel} />
                <CycleBurndown model={expandedModel} />
              </div>
              <WorkItemsList model={expandedModel} onCreateIssue={onCreateIssue} />
            </article>
          ) : null}
        </div>
      )}
    </section>
  )
}
