import { addDays, dayKey, toDate } from '../../../lib/dateFormatting'
import type { Issue, IssueBlocker, ModuleIssueLink, ProjectModule } from '../../../types'

const dayMs = 86_400_000
const fallbackAnchor = new Date('2026-06-01T00:00:00')
const defaultDurationDays = 4

export type TimelineIssueRange = {
  issue: Issue
  start: Date
  end: Date
}

export type TimelineDay = {
  date: Date
  key: string
  isWeekend: boolean
}

export type TimelineSpan = {
  key: string
  label: string
  startIndex: number
  dayCount: number
}

export type TimelineWeekSpan = TimelineSpan & {
  rangeLabel: string
}

export type TimelineModuleGroup = {
  id: string
  name: string
  module: ProjectModule | null
  ranges: TimelineIssueRange[]
}

export type TimelineRow = {
  rowId: string
  groupId: string
  issueId: string
}

export type TimelineConnector = {
  id: string
  blockerIssueId: string
  blockedIssueId: string
  sourceRowId: string
  targetRowId: string
}

const compareByNameThenId = <T extends { name: string; id: string }>(left: T, right: T) =>
  left.name.localeCompare(right.name, undefined, { sensitivity: 'base' }) || left.id.localeCompare(right.id)

export const daysBetweenInclusive = (start: Date, end: Date) =>
  Math.max(1, Math.round((stripTime(end).getTime() - stripTime(start).getTime()) / dayMs) + 1)

export const stripTime = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

export const isWeekend = (date: Date) => {
  const day = date.getDay()
  return day === 0 || day === 6
}

export const getQuarterLabel = (date: Date) =>
  `Q${Math.floor(date.getMonth() / 3) + 1} ${date.getFullYear()}`

const startOfWeek = (date: Date) => addDays(stripTime(date), -date.getDay())

export const getWeekLabel = (date: Date) => {
  const weekStart = startOfWeek(date)
  const firstWeekStart = startOfWeek(new Date(weekStart.getFullYear(), 0, 1))

  return `W${Math.floor((weekStart.getTime() - firstWeekStart.getTime()) / (7 * dayMs)) + 1}`
}

export const formatWeekRangeLabel = (start: Date, end: Date) => {
  const sameMonth = start.getMonth() === end.getMonth() && start.getFullYear() === end.getFullYear()
  if (sameMonth) return `${start.getDate()} - ${end.getDate()}`

  const startMonth = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(start)
  const endMonth = new Intl.DateTimeFormat(undefined, { month: 'short' }).format(end)
  if (start.getFullYear() !== end.getFullYear()) {
    return `${start.getDate()} ${startMonth} - ${end.getDate()} ${endMonth}`
  }

  return `${start.getDate()} ${startMonth} - ${end.getDate()}`
}

export const buildIssueRange = (issue: Issue): TimelineIssueRange => {
  const createdDate = toDate(issue.created_at.slice(0, 10)) ?? stripTime(fallbackAnchor)
  const start = stripTime(toDate(issue.start_date) ?? toDate(issue.target_date) ?? createdDate)
  const target = stripTime(toDate(issue.target_date) ?? addDays(start, defaultDurationDays - 1))
  const end = target < start ? start : target
  return { issue, start, end }
}

export const buildIssueRanges = (issues: Issue[]) =>
  issues
    .map(buildIssueRange)
    .sort((left, right) => left.start.getTime() - right.start.getTime() || left.issue.title.localeCompare(right.issue.title))

export const buildTimelineDays = (start: Date, end: Date): TimelineDay[] => {
  const first = stripTime(start)
  const count = daysBetweenInclusive(first, end)
  return Array.from({ length: count }, (_, index) => {
    const date = addDays(first, index)
    return { date, key: dayKey(date), isWeekend: isWeekend(date) }
  })
}

export const buildTimelineRange = (ranges: TimelineIssueRange[]) => {
  const anchor = ranges[0]?.start ?? stripTime(fallbackAnchor)
  const minTime = Math.min(...ranges.map((range) => range.start.getTime()), addDays(anchor, -14).getTime())
  const maxTime = Math.max(...ranges.map((range) => range.end.getTime()), addDays(anchor, 45).getTime())
  return {
    start: stripTime(new Date(minTime)),
    end: stripTime(new Date(maxTime)),
  }
}

export const buildMonthSpans = (days: TimelineDay[]): TimelineSpan[] => {
  const formatter = new Intl.DateTimeFormat(undefined, { month: 'short', year: 'numeric' })
  return buildDateSpans(days, (date) => `${date.getFullYear()}-${date.getMonth()}`, formatter.format)
}

export const buildQuarterSpans = (days: TimelineDay[]): TimelineSpan[] =>
  buildDateSpans(days, (date) => `${date.getFullYear()}-Q${Math.floor(date.getMonth() / 3) + 1}`, getQuarterLabel)

export const buildWeekSpans = (days: TimelineDay[]): TimelineWeekSpan[] => {
  const spans = buildDateSpans(days, (date) => dayKey(startOfWeek(date)), getWeekLabel)
  return spans.map((span) => {
    const start = days[span.startIndex].date
    const end = days[span.startIndex + span.dayCount - 1].date
    return {
      ...span,
      rangeLabel: formatWeekRangeLabel(start, end),
    }
  })
}

const buildDateSpans = (
  days: TimelineDay[],
  keyForDate: (date: Date) => string,
  labelForDate: (date: Date) => string,
): TimelineSpan[] => {
  const spans: TimelineSpan[] = []

  days.forEach((day, index) => {
    const key = keyForDate(day.date)
    const current = spans[spans.length - 1]
    if (current?.key === key) {
      current.dayCount += 1
      return
    }

    spans.push({
      key,
      label: labelForDate(day.date),
      startIndex: index,
      dayCount: 1,
    })
  })

  return spans
}

export const buildModuleTimelineGroups = ({
  ranges,
  modules,
  moduleIssueLinks,
}: {
  ranges: TimelineIssueRange[]
  modules: ProjectModule[]
  moduleIssueLinks: ModuleIssueLink[]
}): TimelineModuleGroup[] => {
  const issueIds = new Set(ranges.map((range) => range.issue.id))
  const linkedModuleIdsByIssueId = new Map<string, Set<string>>()
  const modulesById = new Map(modules.map((projectModule) => [projectModule.id, projectModule]))

  moduleIssueLinks.forEach((link) => {
    if (!link.issue_id || !link.module_id || !issueIds.has(link.issue_id)) return
    if (!modulesById.has(link.module_id) && link.module) {
      modulesById.set(link.module_id, link.module)
    }
    if (!modulesById.has(link.module_id)) return

    const moduleIds = linkedModuleIdsByIssueId.get(link.issue_id) ?? new Set<string>()
    moduleIds.add(link.module_id)
    linkedModuleIdsByIssueId.set(link.issue_id, moduleIds)
  })

  const sortedModules = Array.from(modulesById.values()).sort(compareByNameThenId)
  const groups: TimelineModuleGroup[] = sortedModules
    .map((projectModule) => ({
      id: projectModule.id,
      name: projectModule.name,
      module: projectModule,
      ranges: ranges.filter((range) => linkedModuleIdsByIssueId.get(range.issue.id)?.has(projectModule.id)),
    }))

  const unlinkedRanges = ranges.filter((range) => !linkedModuleIdsByIssueId.has(range.issue.id))
  if (unlinkedRanges.length > 0 || groups.length === 0) {
    groups.push({
      id: 'no-module',
      name: 'No module',
      module: null,
      ranges: unlinkedRanges,
    })
  }

  return groups
}

export const buildTimelineRows = (groups: TimelineModuleGroup[]): TimelineRow[] =>
  groups.flatMap((group) =>
    group.ranges.map((range) => ({
      rowId: `${group.id}:${range.issue.id}`,
      groupId: group.id,
      issueId: range.issue.id,
    })),
  )

export const buildVisibleBlockerConnectors = (blockers: IssueBlocker[], rows: TimelineRow[]): TimelineConnector[] => {
  const rowsByIssueId = new Map<string, TimelineRow[]>()
  rows.forEach((row) => {
    const issueRows = rowsByIssueId.get(row.issueId) ?? []
    issueRows.push(row)
    rowsByIssueId.set(row.issueId, issueRows)
  })

  return blockers.flatMap((blocker) => {
    if (!blocker.issue_id || !blocker.blocker_issue_id) return []

    const sourceRows = rowsByIssueId.get(blocker.blocker_issue_id) ?? []
    const targetRows = rowsByIssueId.get(blocker.issue_id) ?? []
    if (sourceRows.length === 0 || targetRows.length === 0) return []

    const sameGroupSource = sourceRows.find((source) => targetRows.some((target) => target.groupId === source.groupId))
    const sourceRow = sameGroupSource ?? sourceRows[0]
    const targetRow = targetRows.find((target) => target.groupId === sourceRow.groupId) ?? targetRows[0]

    return [{
      id: blocker.id,
      blockerIssueId: blocker.blocker_issue_id,
      blockedIssueId: blocker.issue_id,
      sourceRowId: sourceRow.rowId,
      targetRowId: targetRow.rowId,
    }]
  })
}
