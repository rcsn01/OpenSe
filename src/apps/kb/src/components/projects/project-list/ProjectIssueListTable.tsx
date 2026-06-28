import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { useNavigate } from 'react-router-dom'
import { Badge, Button, Checkbox, Dropdown, DropdownSeparator, Radio } from '@repo/ui'
import { ArrowUpDown, Calendar, CalendarDays, ChevronDown, Circle, ListFilter, MoreHorizontal, Plus, Search, SlidersHorizontal, TableProperties } from 'lucide-react'
import { IssueDetailContent } from '../../issues/issue-detail/IssueDetailContent'
import { CycleDetailContent, CycleProgressRing as DetailCycleProgressRing } from '../../cycles/CycleDetailContent'
import { buildCycleDetailModel } from '../../cycles/cycleDetailModel'
import { EntityPreviewPaneShell } from '../../entity-preview/EntityPreviewPaneShell'
import { useIssue } from '../../../hooks/queries/useIssues'
import type { Cycle, CycleIssueLink, Issue, IssueAssignee, IssuePriority, IssueState, ModuleIssueLink, OrganisationMemberProfile, ProjectModule } from '../../../types'
import { formatIssueKey, issuePriorityOptions, issuePriorityTone as priorityTone } from '../../../lib/issueFormatting'
import { formatShortDate, toDate } from '../../../lib/dateFormatting'

type ProjectIssueListDueBucket = 'overdue' | 'today' | 'this_week' | 'later' | 'no_due'
type ProjectIssueListSortField = 'manual' | 'title' | 'due_date' | 'priority' | 'status' | 'assignee' | 'created_at' | 'updated_at'
type ProjectIssueListSortDirection = 'asc' | 'desc'
type ProjectIssueListGroupKey = 'status' | 'assignee' | 'priority' | 'due_date' | 'module' | 'cycle' | 'none'

type ProjectIssueListFilters = {
  query: string
  stateIds: string[]
  assigneeIds: string[]
  priorities: IssuePriority[]
  dueBuckets: ProjectIssueListDueBucket[]
  showCompleted: boolean
}

type ProjectIssueListSort = {
  field: ProjectIssueListSortField
  direction: ProjectIssueListSortDirection
}

type ProjectIssueListOptions = {
  columns: {
    assignee: boolean
    dueDate: boolean
    effort: boolean
    priority: boolean
    status: boolean
  }
  compactRows: boolean
  wrapTitles: boolean
  showIssueKeys: boolean
  showEmptyGroups: boolean
}

type ProjectIssueListViewConfig = {
  filters: ProjectIssueListFilters
  sort: ProjectIssueListSort
  groupBy: ProjectIssueListGroupKey
  options: ProjectIssueListOptions
}

type ProjectIssueListGroup = {
  id: string
  title: string
  issues: Issue[]
  module?: ProjectModule | null
  cycle?: Cycle | null
}

const defaultProjectIssueListFilters: ProjectIssueListFilters = {
  query: '',
  stateIds: [],
  assigneeIds: [],
  priorities: [],
  dueBuckets: [],
  showCompleted: true,
}

const defaultProjectIssueListSort: ProjectIssueListSort = {
  field: 'manual',
  direction: 'asc',
}

const defaultProjectIssueListOptions: ProjectIssueListOptions = {
  columns: {
    assignee: true,
    dueDate: true,
    effort: true,
    priority: true,
    status: true,
  },
  compactRows: false,
  wrapTitles: false,
  showIssueKeys: false,
  showEmptyGroups: true,
}

const dueBucketLabels: Record<ProjectIssueListDueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'Next 7 days',
  later: 'Later',
  no_due: 'No due date',
}

const sortFieldLabels: Record<ProjectIssueListSortField, string> = {
  manual: 'Manual',
  title: 'Title',
  due_date: 'Due date',
  priority: 'Priority',
  status: 'Status',
  assignee: 'Assignee',
  created_at: 'Created',
  updated_at: 'Updated',
}

const groupLabels: Record<ProjectIssueListGroupKey, string> = {
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
  due_date: 'Due date',
  module: 'Module',
  cycle: 'Cycle',
  none: 'No grouping',
}

const moduleStatusLabel: Record<ProjectModule['status'], string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

const moduleStatusClass: Record<ProjectModule['status'], string> = {
  backlog: 'bg-[var(--color-muted)] text-[var(--color-muted-foreground)]',
  planned: 'bg-blue-100 text-blue-700',
  in_progress: 'bg-amber-100 text-amber-700',
  completed: 'bg-emerald-100 text-emerald-700',
  cancelled: 'bg-rose-100 text-rose-700',
}

const priorityRank: Record<IssuePriority, number> = {
  urgent: 4,
  high: 3,
  medium: 2,
  low: 1,
  none: 0,
}

const EmptyAssignee = () => (
  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)] text-[var(--color-muted-foreground)]">
    <span className="h-2 w-2 rounded-full border border-current" />
  </span>
)

const getProfileDisplayName = (profile: IssueAssignee['profile'] | OrganisationMemberProfile['profile'] | null | undefined) =>
  profile?.full_name || profile?.username || profile?.email || 'User'

const getInitials = (displayName: string) =>
  displayName
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()

const AssigneeCell = ({
  assignees,
}: {
  assignees: IssueAssignee[]
}) => {
  const assignee = assignees[0]
  if (!assignee) return <EmptyAssignee />

  const displayName = getProfileDisplayName(assignee.profile)
  const initials = getInitials(displayName)

  return (
    <span className="inline-flex min-w-0 items-center gap-2">
      <span className="inline-flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-cyan-500 text-[10px] font-semibold text-white">
        {initials || 'U'}
      </span>
      <span className="truncate text-xs text-[var(--color-foreground)]">{displayName}</span>
      {assignees.length > 1 ? <span className="text-xs text-[var(--color-muted-foreground)]">+{assignees.length - 1}</span> : null}
    </span>
  )
}

const serializeListViewConfig = (config: ProjectIssueListViewConfig) => JSON.stringify(config)

const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

const getDateKey = (date: Date) => date.toISOString().slice(0, 10)

const getDueBucket = (issue: Issue, now = new Date()): ProjectIssueListDueBucket => {
  if (!issue.target_date) return 'no_due'
  const target = toDate(issue.target_date)
  if (!target) return 'no_due'

  const today = new Date(now)
  today.setHours(0, 0, 0, 0)
  const targetDay = new Date(target)
  targetDay.setHours(0, 0, 0, 0)
  const sevenDays = new Date(today)
  sevenDays.setDate(today.getDate() + 7)

  if (targetDay < today) return 'overdue'
  if (getDateKey(targetDay) === getDateKey(today)) return 'today'
  if (targetDay <= sevenDays) return 'this_week'
  return 'later'
}

const getAssigneeName = (assignees: IssueAssignee[]) => assignees[0] ? getProfileDisplayName(assignees[0].profile) : 'Unassigned'

const createToggle = <TValue extends string>(value: TValue, values: TValue[]) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

const isProjectIssueComplete = (issue: Issue) =>
  Boolean(issue.completed_at || issue.state?.group_key === 'completed' || issue.state?.name?.toLowerCase().includes('done') || issue.state?.name?.toLowerCase().includes('resolved'))

const compareValues = (left: string | number, right: string | number, direction: ProjectIssueListSortDirection) => {
  const comparison = typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
  return direction === 'asc' ? comparison : -comparison
}

const buildIssueAssigneesByIssueId = (assignees: IssueAssignee[]) => {
  const map = new Map<string, IssueAssignee[]>()
  assignees.forEach((assignee) => {
    if (!assignee.issue_id) return
    const issueAssignees = map.get(assignee.issue_id) ?? []
    issueAssignees.push(assignee)
    map.set(assignee.issue_id, issueAssignees)
  })
  return map
}

const buildModuleLinksByIssueId = (moduleIssueLinks: ModuleIssueLink[]) => {
  const map = new Map<string, ModuleIssueLink[]>()
  moduleIssueLinks.forEach((link) => {
    if (!link.issue_id) return
    const issueLinks = map.get(link.issue_id) ?? []
    issueLinks.push(link)
    map.set(link.issue_id, issueLinks)
  })
  return map
}

const buildCycleLinkByIssueId = (cycleIssueLinks: CycleIssueLink[]) => {
  const map = new Map<string, CycleIssueLink>()
  cycleIssueLinks.forEach((link) => {
    if (!link.issue_id || map.has(link.issue_id)) return
    map.set(link.issue_id, link)
  })
  return map
}

const getAssignableMembers = (members: OrganisationMemberProfile[], assignees: IssueAssignee[]) => {
  const memberById = new Map(members.map((member) => [member.profile_id, member]))
  assignees.forEach((assignee) => {
    if (!assignee.profile_id || memberById.has(assignee.profile_id) || !assignee.profile) return
    memberById.set(assignee.profile_id, {
      profile_id: assignee.profile_id,
      role: 'member',
      profile: assignee.profile,
    })
  })
  return Array.from(memberById.values()).sort((a, b) => getProfileDisplayName(a.profile).localeCompare(getProfileDisplayName(b.profile)))
}

const filterProjectIssues = ({
  issues,
  filters,
  assigneesByIssueId,
  now,
}: {
  issues: Issue[]
  filters: ProjectIssueListFilters
  assigneesByIssueId: Map<string, IssueAssignee[]>
  now?: Date
}) => {
  const query = filters.query.trim().toLowerCase()
  return issues.filter((issue) => {
    const issueAssignees = assigneesByIssueId.get(issue.id) ?? []
    const isCompleted = Boolean(issue.completed_at || issue.state?.group_key === 'completed')
    if (!filters.showCompleted && isCompleted) return false
    if (query && !`${formatIssueKey(issue)} ${issue.title} ${issue.description_text ?? ''}`.toLowerCase().includes(query)) return false
    if (filters.stateIds.length > 0 && (!issue.state_id || !filters.stateIds.includes(issue.state_id))) return false
    if (filters.assigneeIds.length > 0 && !issueAssignees.some((assignee) => assignee.profile_id && filters.assigneeIds.includes(assignee.profile_id))) return false
    if (filters.priorities.length > 0 && !filters.priorities.includes(issue.priority)) return false
    if (filters.dueBuckets.length > 0 && !filters.dueBuckets.includes(getDueBucket(issue, now))) return false
    return true
  })
}

const sortProjectIssues = ({
  issues,
  sort,
  assigneesByIssueId,
  stateById,
}: {
  issues: Issue[]
  sort: ProjectIssueListSort
  assigneesByIssueId: Map<string, IssueAssignee[]>
  stateById: Map<string, IssueState>
}) => {
  if (sort.field === 'manual') return issues
  return issues.slice().sort((left, right) => {
    const leftAssignees = assigneesByIssueId.get(left.id) ?? []
    const rightAssignees = assigneesByIssueId.get(right.id) ?? []
    switch (sort.field) {
      case 'title':
        return compareValues(left.title, right.title, sort.direction)
      case 'due_date':
        return compareValues(left.target_date ? toDate(left.target_date)?.getTime() ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER, right.target_date ? toDate(right.target_date)?.getTime() ?? Number.MAX_SAFE_INTEGER : Number.MAX_SAFE_INTEGER, sort.direction)
      case 'priority':
        return compareValues(priorityRank[left.priority], priorityRank[right.priority], sort.direction)
      case 'status':
        return compareValues(stateById.get(left.state_id ?? '')?.sort_order ?? Number.MAX_SAFE_INTEGER, stateById.get(right.state_id ?? '')?.sort_order ?? Number.MAX_SAFE_INTEGER, sort.direction)
      case 'assignee':
        return compareValues(getAssigneeName(leftAssignees), getAssigneeName(rightAssignees), sort.direction)
      case 'created_at':
        return compareValues(toDate(left.created_at)?.getTime() ?? 0, toDate(right.created_at)?.getTime() ?? 0, sort.direction)
      case 'updated_at':
        return compareValues(toDate(left.updated_at ?? left.created_at)?.getTime() ?? 0, toDate(right.updated_at ?? right.created_at)?.getTime() ?? 0, sort.direction)
      default:
        return 0
    }
  })
}

const groupProjectIssues = ({
  issues,
  groupBy,
  options,
  sortedStates,
  assignableMembers,
  assigneesByIssueId,
  cycles,
  cycleLinkByIssueId,
  modules,
  moduleLinksByIssueId,
  moduleById,
}: {
  issues: Issue[]
  groupBy: ProjectIssueListGroupKey
  options: ProjectIssueListOptions
  sortedStates: IssueState[]
  assignableMembers: OrganisationMemberProfile[]
  assigneesByIssueId: Map<string, IssueAssignee[]>
  cycles: Cycle[]
  cycleLinkByIssueId: Map<string, CycleIssueLink>
  modules: ProjectModule[]
  moduleLinksByIssueId: Map<string, ModuleIssueLink[]>
  moduleById: Map<string, ProjectModule>
}): ProjectIssueListGroup[] => {
  if (groupBy === 'none') return [{ id: 'all', title: 'All tasks', issues }]

  if (groupBy === 'status') {
    const grouped = sortedStates.map((state) => ({
      id: state.id,
      title: state.name,
      issues: issues.filter((issue) => issue.state_id === state.id),
    }))
    const uncategorised = issues.filter((issue) => !issue.state_id)
    if (uncategorised.length > 0) grouped.unshift({ id: 'none', title: 'No status', issues: uncategorised })
    return options.showEmptyGroups ? grouped : grouped.filter((group) => group.issues.length > 0)
  }

  if (groupBy === 'assignee') {
    const groupsById = new Map<string, ProjectIssueListGroup>()
    if (options.showEmptyGroups) {
      assignableMembers.forEach((member) => {
        groupsById.set(member.profile_id, {
          id: member.profile_id,
          title: getProfileDisplayName(member.profile),
          issues: [],
        })
      })
    }
    issues.forEach((issue) => {
      const issueAssignees = assigneesByIssueId.get(issue.id) ?? []
      const assignee = issueAssignees[0]
      const id = assignee?.profile_id ?? 'unassigned'
      const title = assignee ? getProfileDisplayName(assignee.profile) : 'Unassigned'
      const existing: ProjectIssueListGroup = groupsById.get(id) ?? { id, title, issues: [] }
      existing.issues.push(issue)
      groupsById.set(id, existing)
    })
    return Array.from(groupsById.values())
      .filter((group) => options.showEmptyGroups || group.issues.length > 0)
      .sort((a, b) => a.title.localeCompare(b.title))
  }

  if (groupBy === 'priority') {
    return issuePriorityOptions
      .map((priority) => ({
        id: priority.value,
        title: priority.label,
        issues: issues.filter((issue) => issue.priority === priority.value),
      }))
      .filter((group) => options.showEmptyGroups || group.issues.length > 0)
  }

  if (groupBy === 'module') {
    const groupsById = new Map<string, ProjectIssueListGroup>()
    if (options.showEmptyGroups) {
      modules.forEach((projectModule) => {
        groupsById.set(projectModule.id, {
          id: projectModule.id,
          title: projectModule.name,
          issues: [],
          module: projectModule,
        })
      })
    }
    issues.forEach((issue) => {
      const issueModuleLinks = moduleLinksByIssueId.get(issue.id) ?? []
      if (issueModuleLinks.length === 0) {
        const existing: ProjectIssueListGroup = groupsById.get('none') ?? { id: 'none', title: 'No module', issues: [] }
        existing.issues.push(issue)
        groupsById.set('none', existing)
        return
      }
      issueModuleLinks.forEach((link) => {
        const id = link.module_id ?? 'none'
        const module = id === 'none' ? null : link.module ?? moduleById.get(id) ?? null
        const title = module?.name ?? 'No module'
        const existing: ProjectIssueListGroup = groupsById.get(id) ?? { id, title, issues: [], module }
        existing.issues.push(issue)
        groupsById.set(id, existing)
      })
    })
    return Array.from(groupsById.values())
      .filter((group) => options.showEmptyGroups || group.issues.length > 0)
      .sort((a, b) => {
        if (a.id === 'none') return 1
        if (b.id === 'none') return -1
        return a.title.localeCompare(b.title)
      })
  }

  if (groupBy === 'cycle') {
    const groupsById = new Map<string, ProjectIssueListGroup>()
    const cycleById = new Map(cycles.map((cycle) => [cycle.id, cycle]))
    if (options.showEmptyGroups) {
      cycles.forEach((cycle) => {
        groupsById.set(cycle.id, {
          id: cycle.id,
          title: cycle.name,
          issues: [],
          cycle,
        })
      })
    }
    issues.forEach((issue) => {
      const link = cycleLinkByIssueId.get(issue.id)
      const id = link?.cycle_id ?? 'none'
      const cycle = id === 'none' ? null : link?.cycle ?? cycleById.get(id) ?? null
      const title = cycle?.name ?? 'No cycle'
      const existing: ProjectIssueListGroup = groupsById.get(id) ?? { id, title, issues: [], cycle }
      existing.issues.push(issue)
      groupsById.set(id, existing)
    })
    return Array.from(groupsById.values())
      .filter((group) => options.showEmptyGroups || group.issues.length > 0)
      .sort((a, b) => {
        if (a.id === 'none') return 1
        if (b.id === 'none') return -1
        return a.title.localeCompare(b.title)
      })
  }

  return (Object.keys(dueBucketLabels) as ProjectIssueListDueBucket[])
    .map((bucket) => ({
      id: bucket,
      title: dueBucketLabels[bucket],
      issues: issues.filter((issue) => getDueBucket(issue) === bucket),
    }))
    .filter((group) => options.showEmptyGroups || group.issues.length > 0)
}

const ListToolbarButton = ({
  children,
  active,
}: {
  children: ReactNode
  active?: boolean
}) => (
  <button
    type="button"
    className={cx(
      'inline-flex items-center gap-1.5 text-xs font-medium text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
      active && 'text-[var(--color-foreground)]',
    )}
  >
    {children}
  </button>
)

const DropdownPanel = ({ children }: { children: ReactNode }) => (
  <div className="w-64 space-y-3 p-1" onClick={(event) => event.stopPropagation()}>
    {children}
  </div>
)

const DropdownSection = ({ title, children }: { title: string; children: ReactNode }) => (
  <div className="space-y-2">
    <div className="px-1 text-[11px] font-semibold uppercase tracking-wide text-[var(--color-muted-foreground)]">{title}</div>
    <div className="space-y-1">{children}</div>
  </div>
)

const DropdownRadio = ({
  name,
  label,
  checked,
  onChange,
}: {
  name: string
  label: string
  checked: boolean
  onChange: () => void
}) => (
  <div className="rounded-[var(--radius-md)] px-2 py-1.5 text-sm hover:bg-[var(--color-muted)]">
    <Radio name={name} label={label} checked={checked} onChange={onChange} />
  </div>
)

const ModuleProgressRing = ({ progress }: { progress: number }) => (
  <span
    className="inline-grid h-[30px] w-[30px] shrink-0 place-items-center rounded-full"
    style={{ background: `conic-gradient(#16a34a 0 ${progress}%, #e5e7eb ${progress}% 100%)` }}
  >
    <span className="grid h-6 w-6 place-items-center rounded-full bg-[var(--color-background)] text-[10px] text-[var(--color-muted-foreground)]">
      {progress}%
    </span>
  </span>
)

const CycleProgressRing = ({ progress, size = 28 }: { progress: number; size?: number }) => (
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

const getModuleDateRangeLabel = (module: ProjectModule) =>
  module.created_at
    ? `${formatShortDate(module.created_at.slice(0, 10))} - ${formatShortDate((module.updated_at ?? module.created_at).slice(0, 10))}`
    : 'No dates'

const getCycleDateRangeLabel = (cycle: Cycle) => {
  if (!cycle.starts_at && !cycle.ends_at) return 'No dates'
  const start = cycle.starts_at ? formatShortDate(cycle.starts_at) : 'No start'
  const end = cycle.ends_at ? formatShortDate(cycle.ends_at) : 'No end'
  return `${start} - ${end}`
}

const getCycleProjectInitial = (cycle: Cycle) =>
  (cycle.project?.identifier || cycle.project?.name || 'P').slice(0, 1).toUpperCase()

const ProjectIssueListGroupHeader = ({
  group,
  groupBy,
  selected,
  onOpenCycle,
}: {
  group: ProjectIssueListGroup
  groupBy: ProjectIssueListGroupKey
  selected?: boolean
  onOpenCycle?: (cycle: Cycle) => void
}) => {
  if (groupBy === 'module' && group.module) {
    const total = group.issues.length
    const completed = group.issues.filter(isProjectIssueComplete).length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return (
      <div className="flex min-h-14 items-center justify-between gap-3 border-b border-[var(--color-border)] px-2.5 py-2">
        <div className="flex min-w-0 items-center gap-3">
          <ChevronDown className="h-4 w-4 shrink-0 fill-current text-[var(--color-muted-foreground)]" />
          <ModuleProgressRing progress={progress} />
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <h2 className="truncate text-sm font-semibold text-[var(--color-foreground)]">{group.title}</h2>
              <span className="shrink-0 text-sm text-[var(--color-muted-foreground)]">{total}</span>
            </div>
            <div className="mt-1 flex min-w-0 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <span className="truncate">{getModuleDateRangeLabel(group.module)}</span>
              <span className="shrink-0">/</span>
              <span className="shrink-0">{completed}/{total} completed</span>
            </div>
          </div>
        </div>
        <span className={cx('inline-flex h-7 shrink-0 items-center rounded-[var(--radius-sm)] px-4 text-xs font-medium', moduleStatusClass[group.module.status])}>
          {moduleStatusLabel[group.module.status]}
        </span>
      </div>
    )
  }

  if (groupBy === 'cycle' && group.cycle) {
    const total = group.issues.length
    const completed = group.issues.filter(isProjectIssueComplete).length
    const progress = total > 0 ? Math.round((completed / total) * 100) : 0

    return (
      <button
        type="button"
        className={cx(
          'grid min-h-14 w-full grid-cols-[minmax(16rem,1fr)_auto] items-center gap-4 border-b border-[var(--color-border)] px-6 py-2 text-left hover:bg-[var(--color-muted)]/60',
          selected && 'bg-blue-50',
        )}
        onClick={() => onOpenCycle?.(group.cycle!)}
      >
        <div className="flex min-w-0 items-center gap-4">
          <ChevronDown className="h-4 w-4 shrink-0 fill-current text-[var(--color-muted-foreground)]" />
          <CycleProgressRing progress={progress} />
          <h2 className="min-w-0 truncate text-base font-semibold text-[var(--color-foreground)]">{group.title}</h2>
        </div>
        <div className="flex min-w-max items-center gap-6 text-sm text-[var(--color-muted-foreground)]">
          <span className="inline-flex items-center gap-2">
            <CycleProgressRing progress={progress} size={18} />
            <span>{progress}% ({completed}/{total})</span>
          </span>
          <span className="font-semibold text-emerald-700">Leading 0</span>
          <span className="hidden h-8 items-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 md:inline-flex">
            <CalendarDays className="h-4 w-4" />
            {getCycleDateRangeLabel(group.cycle)}
          </span>
          <span className="inline-grid h-8 w-8 place-items-center rounded-full bg-[#006aa6] text-sm font-semibold text-white">
            {getCycleProjectInitial(group.cycle)}
          </span>
          <MoreHorizontal className="h-4 w-4" />
        </div>
      </button>
    )
  }

  return (
    <div className="flex h-14 items-center gap-2 border-b border-[var(--color-border)] px-2.5">
      <ChevronDown className="h-4 w-4 fill-current text-[var(--color-muted-foreground)]" />
      <h2 className="text-base font-semibold">{group.title}</h2>
      <span className="text-sm text-[var(--color-muted-foreground)]">{group.issues.length}</span>
    </div>
  )
}

export const ProjectIssueListTable = ({
  tabId,
  issues,
  states,
  members,
  assignees,
  cycles,
  cycleIssueLinks,
  modules,
  moduleIssueLinks,
  listViewConfig,
  onListViewChange,
  selectedIssueId,
  selectedCycleId,
  onOpenIssue,
  onOpenCycle,
  onCreateIssue,
  showProjectColumn = false,
}: {
  tabId: string | null
  issues: Issue[]
  states: IssueState[]
  members: OrganisationMemberProfile[]
  assignees: IssueAssignee[]
  cycles: Cycle[]
  cycleIssueLinks: CycleIssueLink[]
  modules: ProjectModule[]
  moduleIssueLinks: ModuleIssueLink[]
  listViewConfig: ProjectIssueListViewConfig
  onListViewChange?: (config: ProjectIssueListViewConfig) => void
  selectedIssueId?: string | null
  selectedCycleId?: string | null
  onOpenIssue: (issue: Issue) => void
  onOpenCycle?: (cycle: Cycle) => void
  onCreateIssue: () => void
  showProjectColumn?: boolean
}) => {
  const [filters, setFilters] = useState<ProjectIssueListFilters>(listViewConfig.filters)
  const [sort, setSort] = useState<ProjectIssueListSort>(listViewConfig.sort)
  const [groupBy, setGroupBy] = useState<ProjectIssueListGroupKey>(listViewConfig.groupBy)
  const [options, setOptions] = useState<ProjectIssueListOptions>(listViewConfig.options)
  const [searchOpen, setSearchOpen] = useState(false)
  const lastPersistedConfigRef = useRef(serializeListViewConfig(listViewConfig))
  const currentListViewConfig = useMemo<ProjectIssueListViewConfig>(
    () => ({ filters, sort, groupBy, options }),
    [filters, groupBy, options, sort],
  )
  const currentListViewConfigKey = useMemo(() => serializeListViewConfig(currentListViewConfig), [currentListViewConfig])

  useEffect(() => {
    if (!tabId || !onListViewChange) return
    if (currentListViewConfigKey === lastPersistedConfigRef.current) return

    const timeout = window.setTimeout(() => {
      lastPersistedConfigRef.current = currentListViewConfigKey
      onListViewChange(currentListViewConfig)
    }, 700)

    return () => window.clearTimeout(timeout)
  }, [currentListViewConfig, currentListViewConfigKey, onListViewChange, tabId])

  const sortedStates = useMemo(
    () => states.slice().sort((a, b) => a.sort_order - b.sort_order || a.name.localeCompare(b.name)),
    [states],
  )
  const stateById = useMemo(() => new Map(states.map((state) => [state.id, state])), [states])
  const assigneesByIssueId = useMemo(() => buildIssueAssigneesByIssueId(assignees), [assignees])
  const moduleLinksByIssueId = useMemo(() => buildModuleLinksByIssueId(moduleIssueLinks), [moduleIssueLinks])
  const moduleById = useMemo(() => new Map(modules.map((projectModule) => [projectModule.id, projectModule])), [modules])
  const cycleLinkByIssueId = useMemo(() => buildCycleLinkByIssueId(cycleIssueLinks), [cycleIssueLinks])
  const assignableMembers = useMemo(() => getAssignableMembers(members, assignees), [assignees, members])
  const activeFilterCount = filters.stateIds.length + filters.assigneeIds.length + filters.priorities.length + filters.dueBuckets.length + (filters.query.trim() ? 1 : 0) + (filters.showCompleted ? 0 : 1)
  const visibleColumns = [
    showProjectColumn ? '8rem' : null,
    options.columns.assignee ? '7.5rem' : null,
    options.columns.dueDate ? '7.5rem' : null,
    options.columns.effort ? '7.5rem' : null,
    options.columns.priority ? '7.5rem' : null,
    options.columns.status ? '7.5rem' : null,
  ].filter(Boolean)
  const gridTemplateColumns = `minmax(26rem,1fr)${visibleColumns.length > 0 ? ` ${visibleColumns.join(' ')}` : ''} 3.5rem`
  const rowHeightClassName = options.compactRows ? 'min-h-8' : 'min-h-9'

  const filteredIssues = useMemo(
    () => filterProjectIssues({ issues, filters, assigneesByIssueId }),
    [assigneesByIssueId, filters, issues],
  )

  const sortedIssues = useMemo(
    () => sortProjectIssues({ issues: filteredIssues, sort, assigneesByIssueId, stateById }),
    [assigneesByIssueId, filteredIssues, sort, stateById],
  )

  const groups = useMemo(
    () => groupProjectIssues({
      issues: sortedIssues,
      groupBy,
      options,
      sortedStates,
      assignableMembers,
      assigneesByIssueId,
      cycles,
      cycleLinkByIssueId,
      modules,
      moduleLinksByIssueId,
      moduleById,
    }),
    [assigneesByIssueId, assignableMembers, cycleLinkByIssueId, cycles, groupBy, moduleById, moduleLinksByIssueId, modules, options, sortedIssues, sortedStates],
  )

  const resetView = () => {
    setFilters(defaultProjectIssueListFilters)
    setSort(defaultProjectIssueListSort)
    setGroupBy('status')
    setOptions(defaultProjectIssueListOptions)
    setSearchOpen(false)
  }

  const toggleColumn = (column: keyof ProjectIssueListOptions['columns']) => {
    setOptions((current) => ({
      ...current,
      columns: {
        ...current.columns,
        [column]: !current.columns[column],
      },
    }))
  }

  return (
    <section className="flex min-h-0 flex-1 flex-col bg-[var(--color-background)] text-sm">
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
        <div className="flex min-w-0 items-center gap-4 text-xs font-medium text-[var(--color-muted-foreground)]">
          {searchOpen ? (
            <div className="relative">
              <Search className="pointer-events-none absolute left-2 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-[var(--color-muted-foreground)]" />
              <input
                aria-label="Search tasks"
                className="h-8 w-52 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] pl-7 pr-2 text-sm text-[var(--color-foreground)] outline-none focus:border-[var(--color-border-hover)]"
                value={filters.query}
                onChange={(event) => setFilters((current) => ({ ...current, query: event.target.value }))}
                placeholder="Search tasks..."
              />
            </div>
          ) : null}

          <Dropdown
            align="right"
            trigger={<ListToolbarButton active={activeFilterCount > 0}><ListFilter className="h-3.5 w-3.5" />{activeFilterCount > 0 ? `${activeFilterCount} Filters` : 'Filter'}</ListToolbarButton>}
            className="min-w-72"
          >
            <DropdownPanel>
              <DropdownSection title="Status">
                {sortedStates.map((state) => (
                  <Checkbox
                    key={state.id}
                    label={state.name}
                    checked={filters.stateIds.includes(state.id)}
                    onChange={() => setFilters((current) => ({ ...current, stateIds: createToggle(state.id, current.stateIds) }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Assignee">
                {assignableMembers.map((member) => (
                  <Checkbox
                    key={member.profile_id}
                    label={getProfileDisplayName(member.profile)}
                    checked={filters.assigneeIds.includes(member.profile_id)}
                    onChange={() => setFilters((current) => ({ ...current, assigneeIds: createToggle(member.profile_id, current.assigneeIds) }))}
                  />
                ))}
                {assignableMembers.length === 0 ? <div className="px-2 py-1 text-sm text-[var(--color-muted-foreground)]">No assignees</div> : null}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Priority">
                {issuePriorityOptions.map((priority) => (
                  <Checkbox
                    key={priority.value}
                    label={priority.label}
                    checked={filters.priorities.includes(priority.value)}
                    onChange={() => setFilters((current) => ({ ...current, priorities: createToggle(priority.value, current.priorities) }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Due date">
                {(Object.keys(dueBucketLabels) as ProjectIssueListDueBucket[]).map((bucket) => (
                  <Checkbox
                    key={bucket}
                    label={dueBucketLabels[bucket]}
                    checked={filters.dueBuckets.includes(bucket)}
                    onChange={() => setFilters((current) => ({ ...current, dueBuckets: createToggle(bucket, current.dueBuckets) }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <Checkbox
                label="Show completed"
                checked={filters.showCompleted}
                onChange={(event) => setFilters((current) => ({ ...current, showCompleted: event.target.checked }))}
              />
            </DropdownPanel>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={<ListToolbarButton active={sort.field !== 'manual'}><ArrowUpDown className="h-3.5 w-3.5" />{sort.field === 'manual' ? 'Sort' : sortFieldLabels[sort.field]}</ListToolbarButton>}
          >
            <DropdownPanel>
              <DropdownSection title="Sort by">
                {(Object.keys(sortFieldLabels) as ProjectIssueListSortField[]).map((field) => (
                  <DropdownRadio
                    key={field}
                    name="project-list-sort-field"
                    label={sortFieldLabels[field]}
                    checked={sort.field === field}
                    onChange={() => setSort((current) => ({ ...current, field }))}
                  />
                ))}
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Direction">
                <DropdownRadio name="project-list-sort-direction" label="Ascending" checked={sort.direction === 'asc'} onChange={() => setSort((current) => ({ ...current, direction: 'asc' }))} />
                <DropdownRadio name="project-list-sort-direction" label="Descending" checked={sort.direction === 'desc'} onChange={() => setSort((current) => ({ ...current, direction: 'desc' }))} />
              </DropdownSection>
            </DropdownPanel>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={<ListToolbarButton active={groupBy !== 'status'}><TableProperties className="h-3.5 w-3.5" />{groupBy === 'status' ? 'Group' : groupLabels[groupBy]}</ListToolbarButton>}
          >
            <DropdownPanel>
              <DropdownSection title="Group by">
                {(Object.keys(groupLabels) as ProjectIssueListGroupKey[]).map((groupKey) => (
                  <DropdownRadio
                    key={groupKey}
                    name="project-list-group"
                    label={groupLabels[groupKey]}
                    checked={groupBy === groupKey}
                    onChange={() => setGroupBy(groupKey)}
                  />
                ))}
              </DropdownSection>
            </DropdownPanel>
          </Dropdown>

          <Dropdown
            align="right"
            trigger={<ListToolbarButton><SlidersHorizontal className="h-3.5 w-3.5" />Options</ListToolbarButton>}
          >
            <DropdownPanel>
              <DropdownSection title="Columns">
                <Checkbox label="Assignee" checked={options.columns.assignee} onChange={() => toggleColumn('assignee')} />
                <Checkbox label="Due date" checked={options.columns.dueDate} onChange={() => toggleColumn('dueDate')} />
                <Checkbox label="Effort" checked={options.columns.effort} onChange={() => toggleColumn('effort')} />
                <Checkbox label="Priority" checked={options.columns.priority} onChange={() => toggleColumn('priority')} />
                <Checkbox label="Status" checked={options.columns.status} onChange={() => toggleColumn('status')} />
              </DropdownSection>
              <DropdownSeparator />
              <DropdownSection title="Display">
                <Checkbox label="Compact rows" checked={options.compactRows} onChange={(event) => setOptions((current) => ({ ...current, compactRows: event.target.checked }))} />
                <Checkbox label="Wrap task titles" checked={options.wrapTitles} onChange={(event) => setOptions((current) => ({ ...current, wrapTitles: event.target.checked }))} />
                <Checkbox label="Show issue keys" checked={options.showIssueKeys} onChange={(event) => setOptions((current) => ({ ...current, showIssueKeys: event.target.checked }))} />
                <Checkbox label="Show empty groups" checked={options.showEmptyGroups} onChange={(event) => setOptions((current) => ({ ...current, showEmptyGroups: event.target.checked }))} />
              </DropdownSection>
              <DropdownSeparator />
              <Button type="button" variant="outline" size="sm" className="w-full justify-center" onClick={resetView}>Reset view</Button>
            </DropdownPanel>
          </Dropdown>

          <button type="button" className="inline-flex items-center hover:text-[var(--color-foreground)]" aria-label="Search tasks" onClick={() => setSearchOpen((current) => !current)}>
            <Search className="h-4 w-4" />
          </button>
        </div>
      </div>

      <div className="min-h-0 flex-1 overflow-auto">
        <div className="sticky top-0 z-10 grid h-9 border-b border-[var(--color-border)] bg-[var(--color-background)] text-xs text-[var(--color-muted-foreground)]" style={{ gridTemplateColumns }}>
          <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Name</div>
          {showProjectColumn ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Project</div> : null}
          {options.columns.assignee ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Assignee</div> : null}
          {options.columns.dueDate ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Due date</div> : null}
          {options.columns.effort ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Effort</div> : null}
          {options.columns.priority ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Priority</div> : null}
          {options.columns.status ? <div className="flex items-center border-r border-[var(--color-border)] px-2.5">Status</div> : null}
          <div className="flex items-center justify-center">
            <Plus className="h-4 w-4" />
          </div>
        </div>
        {groups.map((group) => (
          <div key={group.id}>
            <ProjectIssueListGroupHeader
              group={group}
              groupBy={groupBy}
              selected={Boolean(group.cycle && selectedCycleId === group.cycle.id)}
              onOpenCycle={onOpenCycle}
            />

            {group.issues.map((issue) => (
              <div key={issue.id} className={cx('grid border-b border-[var(--color-border)] hover:bg-[var(--color-muted)]/60', selectedIssueId === issue.id ? 'bg-blue-50' : '', rowHeightClassName)} style={{ gridTemplateColumns }}>
                <button type="button" onClick={() => onOpenIssue(issue)} className="flex min-w-0 items-center gap-2 border-r border-[var(--color-border)] px-7 text-left">
                  <Circle className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                  <span className={cx('min-w-0 text-sm text-[var(--color-foreground)]', options.wrapTitles ? 'whitespace-normal py-2' : 'truncate')}>
                    {options.showIssueKeys ? <span className="mr-2 font-mono text-xs text-[var(--color-muted-foreground)]">{formatIssueKey(issue)}</span> : null}
                    {issue.title}
                  </span>
                </button>
                {showProjectColumn ? (
                  <div className="flex min-w-0 items-center border-r border-[var(--color-border)] px-2.5">
                    <span className="inline-flex min-w-0 items-center gap-1.5 rounded-[var(--radius-sm)] bg-[var(--color-muted)] px-2 py-0.5 text-xs font-medium text-[var(--color-muted-foreground)]">
                      <span className="truncate">{issue.project?.identifier || issue.project?.name || 'Project'}</span>
                    </span>
                  </div>
                ) : null}
                {options.columns.assignee ? (
                  <div className="flex min-w-0 items-center border-r border-[var(--color-border)] px-2.5">
                    <AssigneeCell assignees={assigneesByIssueId.get(issue.id) ?? []} />
                  </div>
                ) : null}
                {options.columns.dueDate ? (
                  <div className="flex items-center border-r border-[var(--color-border)] px-2.5">
                    {issue.target_date ? (
                      <span className="text-xs text-[var(--color-muted-foreground)]">{formatShortDate(issue.target_date)}</span>
                    ) : (
                      <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-dashed border-[var(--color-muted-foreground)] text-[var(--color-muted-foreground)]">
                        <Calendar className="h-3.5 w-3.5" />
                      </span>
                    )}
                  </div>
                ) : null}
                {options.columns.effort ? <div className="border-r border-[var(--color-border)]" /> : null}
                {options.columns.priority ? (
                  <div className="flex items-center border-r border-[var(--color-border)] px-2.5">
                    {issue.priority !== 'none' ? <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge> : null}
                  </div>
                ) : null}
                {options.columns.status ? (
                  <div className="flex items-center border-r border-[var(--color-border)] px-2.5 text-xs text-[var(--color-muted-foreground)]">
                    {issue.state?.name ?? ''}
                  </div>
                ) : null}
                <div />
              </div>
            ))}

            <button
              type="button"
              onClick={onCreateIssue}
              className="grid h-9 w-full border-b border-[var(--color-border)] text-left text-sm text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]/50"
              style={{ gridTemplateColumns }}
            >
              <span className="flex items-center border-r border-[var(--color-border)] pl-14">Add task...</span>
              {showProjectColumn ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.assignee ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.dueDate ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.effort ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.priority ? <span className="border-r border-[var(--color-border)]" /> : null}
              {options.columns.status ? <span className="border-r border-[var(--color-border)]" /> : null}
              <span />
            </button>
          </div>
        ))}
        {groups.length === 0 ? (
          <div className="px-6 py-10 text-center text-sm text-[var(--color-muted-foreground)]">No tasks match this view.</div>
        ) : null}
      </div>
    </section>
  )
}

export const ProjectCyclePreviewPane = ({
  cycleId,
  cycles,
  issues,
  cycleIssueLinks,
  onExpand,
  onClose,
}: {
  cycleId: string
  cycles: Cycle[]
  issues: Issue[]
  cycleIssueLinks: CycleIssueLink[]
  onExpand: () => void
  onClose: () => void
}) => {
  const cycle = cycles.find((item) => item.id === cycleId) ?? null
  const model = useMemo(
    () => cycle ? buildCycleDetailModel(cycle, issues, cycleIssueLinks) : null,
    [cycle, cycleIssueLinks, issues],
  )

  return (
    <EntityPreviewPaneShell
      title={model?.cycle.name}
      leading={model ? <DetailCycleProgressRing progress={model.progress} /> : null}
      notFoundTitle={model ? undefined : 'Cycle not found'}
      notFoundDescription={model ? undefined : 'The cycle was deleted or is outside this project.'}
      expandLabel="Expand cycle"
      closeLabel="Close cycle preview"
      onExpand={model ? onExpand : undefined}
      onClose={onClose}
    >
      {model ? <CycleDetailContent model={model} compact showWorkItems={false} /> : null}
    </EntityPreviewPaneShell>
  )
}

export const ProjectIssuePreviewPane = ({
  organisationId,
  projectId,
  issueId,
  listHref,
  expandedHref,
  onClose,
}: {
  organisationId: string
  projectId?: string | null
  issueId: string
  listHref: string
  expandedHref: string
  onClose: () => void
}) => {
  const navigate = useNavigate()
  const { data: issue, isLoading } = useIssue(organisationId, issueId)
  const isExpectedIssue = Boolean(issue && (!projectId || issue.project_id === projectId))

  return (
    <EntityPreviewPaneShell
      title={issue ? formatIssueKey(issue) : undefined}
      isLoading={isLoading}
      loadingLabel="Loading task..."
      notFoundTitle={!isLoading && !isExpectedIssue ? 'Task not found' : undefined}
      notFoundDescription={!isLoading && !isExpectedIssue ? 'The task was deleted or is outside this view.' : undefined}
      expandLabel="Expand issue"
      closeLabel="Close issue detail"
      onExpand={isExpectedIssue ? () => navigate(expandedHref) : undefined}
      onClose={onClose}
    >
      {isExpectedIssue && issue ? (
        <IssueDetailContent
          key={issue.id}
          issue={issue}
          organisationId={organisationId}
          mode="pane"
          backHref={listHref}
          hideToolbar
        />
      ) : null}
    </EntityPreviewPaneShell>
  )
}
