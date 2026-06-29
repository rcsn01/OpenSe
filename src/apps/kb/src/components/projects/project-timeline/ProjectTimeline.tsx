import { useCallback, useLayoutEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { EmptyState } from '@repo/ui'
import { ArrowUpDown, ChevronDown, ListFilter, Plus, Search, SlidersHorizontal, TableProperties } from 'lucide-react'

import { addDays, dayKey, formatShortDate } from '../../../lib/dateFormatting'
import { formatIssueKey } from '../../../lib/issueFormatting'
import { getProjectIssuePath } from '../../../lib/projectRoutes'
import type { Issue, IssueBlocker, ModuleIssueLink, ProjectModule } from '../../../types'
import {
  buildIssueRanges,
  buildModuleTimelineGroups,
  buildMonthSpans,
  buildQuarterSpans,
  buildTimelineDays,
  buildTimelineRows,
  buildVisibleBlockerConnectors,
  daysBetweenInclusive,
  stripTime,
  type TimelineIssueRange,
  type TimelineModuleGroup,
} from './projectTimelineLogic'

type ProjectTimelineProps = {
  projectId: string
  issues: Issue[]
  modules: ProjectModule[]
  moduleIssueLinks: ModuleIssueLink[]
  blockers: IssueBlocker[]
  onCreateIssue: () => void
}

type RenderRow =
  | { kind: 'group'; group: TimelineModuleGroup; top: number }
  | { kind: 'issue'; group: TimelineModuleGroup; range: TimelineIssueRange; rowId: string; top: number }

const leftColumnWidth = 264
const dayWidth = 24
const groupRowHeight = 36
const issueRowHeight = 44
const headerHeight = 96
const barHeight = 28
const barTop = 8
const minimumBarWidth = 20
const initialPastDays = 90
const initialFutureDays = 180
const timelineExtensionDays = 180
const scrollEdgeThreshold = 480
const barColors = ['#8dd7e8', '#bfe88b', '#ffd166', '#f7a072', '#c4b5fd']

const ProjectTimelineToolbar = ({ onCreateIssue }: { onCreateIssue: () => void }) => (
  <div className="flex h-14 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
    <div className="flex items-center gap-0">
      <button
        type="button"
        onClick={onCreateIssue}
        className="inline-flex h-8 items-center gap-2 rounded-l-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
      >
        <Plus className="h-4 w-4" />
        Add task
      </button>
      <button
        type="button"
        className="inline-flex h-8 w-8 items-center justify-center rounded-r-[var(--radius-md)] border border-l-0 border-[var(--color-border)] hover:bg-[var(--color-muted)]"
        aria-label="Add task options"
      >
        <ChevronDown className="h-4 w-4" />
      </button>
    </div>
    <div className="flex items-center gap-5 text-xs font-medium text-[var(--color-muted-foreground)]">
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <ListFilter className="h-3.5 w-3.5" />
        Filter
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <ArrowUpDown className="h-3.5 w-3.5" />
        Sort
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <TableProperties className="h-3.5 w-3.5" />
        Group
      </button>
      <button type="button" className="inline-flex items-center gap-1.5 hover:text-[var(--color-foreground)]">
        <SlidersHorizontal className="h-3.5 w-3.5" />
        Options
      </button>
      <button type="button" className="inline-flex items-center hover:text-[var(--color-foreground)]" aria-label="Search tasks">
        <Search className="h-4 w-4" />
      </button>
    </div>
  </div>
)

const getRangeOffset = (range: TimelineIssueRange, visibleStart: Date) =>
  Math.max(0, daysBetweenInclusive(visibleStart, range.start) - 1)

const getBarStyle = (range: TimelineIssueRange, visibleStart: Date, visibleEnd: Date) => {
  const clampedStart = range.start < visibleStart ? visibleStart : range.start
  const clampedEnd = range.end > visibleEnd ? visibleEnd : range.end
  const left = getRangeOffset({ ...range, start: clampedStart }, visibleStart) * dayWidth
  const width = Math.max(minimumBarWidth, daysBetweenInclusive(clampedStart, clampedEnd) * dayWidth - 8)
  return { left, width }
}

const isRangeVisible = (range: TimelineIssueRange, visibleStart: Date, visibleEnd: Date) =>
  range.end >= visibleStart && range.start <= visibleEnd

const buildRenderRows = (groups: TimelineModuleGroup[]) => {
  const rows: RenderRow[] = []
  let top = 0

  groups.forEach((group) => {
    rows.push({ kind: 'group', group, top })
    top += groupRowHeight

    group.ranges.forEach((range) => {
      rows.push({ kind: 'issue', group, range, rowId: `${group.id}:${range.issue.id}`, top })
      top += issueRowHeight
    })
  })

  return { rows, height: top }
}

const getConnectorPath = ({
  sourceX,
  sourceY,
  targetX,
  targetY,
}: {
  sourceX: number
  sourceY: number
  targetX: number
  targetY: number
}) => {
  const midX = sourceX + (targetX - sourceX) / 2
  return `M ${sourceX} ${sourceY} H ${midX} V ${targetY} H ${targetX}`
}

export const ProjectTimeline = ({
  projectId,
  issues,
  modules,
  moduleIssueLinks,
  blockers,
  onCreateIssue,
}: ProjectTimelineProps) => {
  const scrollContainerRef = useRef<HTMLDivElement | null>(null)
  const didScrollToTodayRef = useRef(false)
  const pendingPrependWidthRef = useRef(0)
  const today = useMemo(() => stripTime(new Date()), [])
  const todayKey = useMemo(() => dayKey(today), [today])
  const [visibleRange, setVisibleRange] = useState(() => ({
    start: addDays(today, -initialPastDays),
    end: addDays(today, initialFutureDays),
  }))
  const ranges = useMemo(() => buildIssueRanges(issues), [issues])
  const days = useMemo(() => buildTimelineDays(visibleRange.start, visibleRange.end), [visibleRange.end, visibleRange.start])
  const monthSpans = useMemo(() => buildMonthSpans(days), [days])
  const quarterSpans = useMemo(() => buildQuarterSpans(days), [days])
  const groups = useMemo(
    () => buildModuleTimelineGroups({ ranges, modules, moduleIssueLinks }),
    [moduleIssueLinks, modules, ranges],
  )
  const timelineRows = useMemo(() => buildTimelineRows(groups), [groups])
  const connectors = useMemo(() => buildVisibleBlockerConnectors(blockers, timelineRows), [blockers, timelineRows])
  const renderModel = useMemo(() => buildRenderRows(groups), [groups])
  const timelineWidth = days.length * dayWidth
  const rowById = useMemo(() => {
    const byId = new Map<string, Extract<RenderRow, { kind: 'issue' }>>()
    renderModel.rows.forEach((row) => {
      if (row.kind === 'issue') byId.set(row.rowId, row)
    })
    return byId
  }, [renderModel.rows])
  const handleScroll = useCallback(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    if (scrollContainer.scrollLeft < scrollEdgeThreshold) {
      setVisibleRange((current) => {
        const nextStart = addDays(current.start, -timelineExtensionDays)
        pendingPrependWidthRef.current += daysBetweenInclusive(nextStart, addDays(current.start, -1)) * dayWidth
        return { ...current, start: nextStart }
      })
    }

    if (scrollContainer.scrollLeft + scrollContainer.clientWidth > scrollContainer.scrollWidth - scrollEdgeThreshold) {
      setVisibleRange((current) => ({
        ...current,
        end: addDays(current.end, timelineExtensionDays),
      }))
    }
  }, [])

  useLayoutEffect(() => {
    const scrollContainer = scrollContainerRef.current
    if (!scrollContainer) return

    if (pendingPrependWidthRef.current > 0) {
      scrollContainer.scrollLeft += pendingPrependWidthRef.current
      pendingPrependWidthRef.current = 0
      return
    }

    if (didScrollToTodayRef.current) return

    const todayOffset = Math.max(0, daysBetweenInclusive(visibleRange.start, today) - 1) * dayWidth
    const visibleTimelineWidth = Math.max(dayWidth, scrollContainer.clientWidth - leftColumnWidth)
    scrollContainer.scrollLeft = Math.max(0, leftColumnWidth + todayOffset - visibleTimelineWidth / 2)
    didScrollToTodayRef.current = true
  }, [today, visibleRange.start])

  if (issues.length === 0) {
    return (
      <section className="-mx-2 flex min-h-0 flex-1 flex-col bg-[var(--color-background)]">
        <ProjectTimelineToolbar onCreateIssue={onCreateIssue} />
        <div className="grid flex-1 place-items-center">
          <EmptyState title="No tasks on this timeline" description="Create a task to start planning this project by module." />
        </div>
      </section>
    )
  }

  return (
    <section className="-mx-2 flex min-h-0 flex-1 flex-col bg-[var(--color-background)]" data-testid="project-timeline">
      <ProjectTimelineToolbar onCreateIssue={onCreateIssue} />
      <div ref={scrollContainerRef} className="min-h-0 flex-1 overflow-auto" onScroll={handleScroll}>
        <div className="relative" style={{ width: leftColumnWidth + timelineWidth, minHeight: headerHeight + renderModel.height }}>
          <div className="sticky top-0 z-40 flex h-24 border-b border-[var(--color-border)] bg-[var(--color-background)]">
            <div
              className="sticky left-0 z-50 flex shrink-0 items-end border-r border-[var(--color-border)] bg-[var(--color-background)] px-4 pb-3 text-xs font-semibold uppercase tracking-normal text-[var(--color-muted-foreground)]"
              style={{ width: leftColumnWidth }}
            >
              Module
            </div>
            <div className="shrink-0" style={{ width: timelineWidth }}>
              <div className="grid h-7 border-b border-[var(--color-border)] text-center text-[11px] font-semibold text-[var(--color-muted-foreground)]" style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}>
                {quarterSpans.map((span) => (
                  <div key={span.key} className="border-r border-[var(--color-border)] px-2 py-1" style={{ gridColumn: `${span.startIndex + 1} / span ${span.dayCount}` }}>
                    {span.label}
                  </div>
                ))}
              </div>
              <div className="grid h-8 border-b border-[var(--color-border)] text-center text-xs font-semibold" style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}>
                {monthSpans.map((span) => (
                  <div key={span.key} className="border-r border-[var(--color-border)] px-2 py-1.5" style={{ gridColumn: `${span.startIndex + 1} / span ${span.dayCount}` }}>
                    {span.label}
                  </div>
                ))}
              </div>
              <div className="grid h-9 text-center text-[11px] text-[var(--color-muted-foreground)]" style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}>
                {days.map((day) => (
                  <div
                    key={day.key}
                    data-testid={day.isWeekend ? 'project-timeline-weekend-cell' : undefined}
                    className={`${day.isWeekend ? 'bg-[#f5f6f8]' : 'bg-white'} ${day.key === todayKey ? 'shadow-[inset_0_0_0_1px_var(--color-primary)]' : ''} border-r border-[var(--color-border)] py-1`}
                  >
                    <div>{new Intl.DateTimeFormat(undefined, { weekday: 'short' }).format(day.date).slice(0, 1)}</div>
                    <div className="font-semibold text-[var(--color-foreground)]">{day.date.getDate()}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="relative" style={{ height: renderModel.height }}>
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute top-0 z-20"
              height={renderModel.height}
              width={timelineWidth}
              style={{ left: leftColumnWidth }}
              data-testid="project-timeline-connectors"
            >
              {connectors.map((connector) => {
                const sourceRow = rowById.get(connector.sourceRowId)
                const targetRow = rowById.get(connector.targetRowId)
                if (!sourceRow || !targetRow) return null
                if (!isRangeVisible(sourceRow.range, visibleRange.start, visibleRange.end) || !isRangeVisible(targetRow.range, visibleRange.start, visibleRange.end)) return null

                const sourceBar = getBarStyle(sourceRow.range, visibleRange.start, visibleRange.end)
                const targetBar = getBarStyle(targetRow.range, visibleRange.start, visibleRange.end)
                const sourceX = sourceBar.left + sourceBar.width
                const targetX = targetBar.left
                const sourceY = sourceRow.top + issueRowHeight / 2
                const targetY = targetRow.top + issueRowHeight / 2

                return (
                  <g key={connector.id} data-testid="project-timeline-connector">
                    <path d={getConnectorPath({ sourceX, sourceY, targetX, targetY })} fill="none" stroke="#94a3b8" strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" />
                    <circle cx={sourceX} cy={sourceY} r="2.5" fill="#94a3b8" />
                    <circle cx={targetX} cy={targetY} r="2.5" fill="#94a3b8" />
                  </g>
                )
              })}
            </svg>

            {renderModel.rows.map((row) => {
              if (row.kind === 'group') {
                return (
                  <div key={`group-${row.group.id}`} className="absolute left-0 flex border-b border-[var(--color-border)]" style={{ top: row.top, height: groupRowHeight, width: leftColumnWidth + timelineWidth }}>
                    <div className="sticky left-0 z-30 flex shrink-0 items-center gap-2 border-r border-[var(--color-border)] bg-[#f8fafc] px-4" style={{ width: leftColumnWidth }}>
                      <ChevronDown className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                      <span className="truncate text-sm font-semibold">{row.group.name}</span>
                      <span className="ml-auto text-xs font-medium text-[var(--color-muted-foreground)]">{row.group.ranges.length}</span>
                    </div>
                    <div className="grid shrink-0" style={{ width: timelineWidth, gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}>
                      {days.map((day) => (
                        <div key={`${row.group.id}-${day.key}`} className={day.isWeekend ? 'border-r border-[var(--color-border)] bg-[#f5f6f8]' : 'border-r border-[var(--color-border)] bg-white'} />
                      ))}
                    </div>
                  </div>
                )
              }

              const { left, width } = getBarStyle(row.range, visibleRange.start, visibleRange.end)
              const barColor = row.range.issue.state?.color || barColors[Math.abs(row.range.issue.id.split('').reduce((sum, character) => sum + character.charCodeAt(0), 0)) % barColors.length]
              const shouldRenderBar = isRangeVisible(row.range, visibleRange.start, visibleRange.end)

              return (
                <div key={row.rowId} className="absolute left-0 flex border-b border-[var(--color-border)]" style={{ top: row.top, height: issueRowHeight, width: leftColumnWidth + timelineWidth }}>
                  <div className="sticky left-0 z-30 grid shrink-0 grid-cols-[4.5rem_minmax(0,1fr)] items-center gap-2 border-r border-[var(--color-border)] bg-[var(--color-background)] px-4 text-sm" style={{ width: leftColumnWidth }}>
                    <span className="font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(row.range.issue)}</span>
                    <span className="truncate font-medium">{row.range.issue.title}</span>
                  </div>
                  <div className="relative shrink-0" style={{ width: timelineWidth }}>
                    <div className="grid h-full" style={{ gridTemplateColumns: `repeat(${days.length}, ${dayWidth}px)` }}>
                      {days.map((day) => (
                        <div key={`${row.rowId}-${day.key}`} className={day.isWeekend ? 'border-r border-[var(--color-border)] bg-[#f5f6f8]' : 'border-r border-[var(--color-border)] bg-white'} />
                      ))}
                    </div>
                    {shouldRenderBar ? (
                      <Link
                        to={getProjectIssuePath(projectId, row.range.issue.id)}
                        className="absolute z-30 flex items-center gap-2 rounded-[4px] px-2 text-xs font-medium text-slate-900 shadow-sm ring-1 ring-black/5 hover:brightness-95"
                        style={{ left, top: barTop, width, height: barHeight, backgroundColor: barColor }}
                        title={`${row.range.issue.title} (${formatShortDate(dayKey(row.range.start))} - ${formatShortDate(dayKey(row.range.end))})`}
                      >
                        <span className="truncate">{row.range.issue.title}</span>
                      </Link>
                    ) : null}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </section>
  )
}
