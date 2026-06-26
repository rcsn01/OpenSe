import type { Cycle, CycleIssueLink, Issue, IssueAssignee, IssuePriority, IssueState, ModuleIssueLink, OrganisationMemberProfile, ProjectModule, ProjectTab } from '../../../types'
import { formatIssueKey, issuePriorityOptions } from '../../../lib/issueFormatting'
import { toDate } from '../../../lib/dateFormatting'

export type ProjectIssueListDueBucket = 'overdue' | 'today' | 'this_week' | 'later' | 'no_due'
export type ProjectIssueListSortField = 'manual' | 'title' | 'due_date' | 'priority' | 'status' | 'assignee' | 'created_at' | 'updated_at'
export type ProjectIssueListSortDirection = 'asc' | 'desc'
export type ProjectIssueListGroupKey = 'status' | 'assignee' | 'priority' | 'due_date' | 'module' | 'cycle' | 'none'

export type ProjectIssueListFilters = {
  query: string
  stateIds: string[]
  assigneeIds: string[]
  priorities: IssuePriority[]
  dueBuckets: ProjectIssueListDueBucket[]
  showCompleted: boolean
}

export type ProjectIssueListSort = {
  field: ProjectIssueListSortField
  direction: ProjectIssueListSortDirection
}

export type ProjectIssueListOptions = {
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

export type ProjectIssueListViewConfig = {
  filters: ProjectIssueListFilters
  sort: ProjectIssueListSort
  groupBy: ProjectIssueListGroupKey
  options: ProjectIssueListOptions
}

export type ProjectIssueListGroup = {
  id: string
  title: string
  issues: Issue[]
  module?: ProjectModule | null
  cycle?: Cycle | null
}

export const defaultProjectIssueListFilters: ProjectIssueListFilters = {
  query: '',
  stateIds: [],
  assigneeIds: [],
  priorities: [],
  dueBuckets: [],
  showCompleted: true,
}

export const defaultProjectIssueListSort: ProjectIssueListSort = {
  field: 'manual',
  direction: 'asc',
}

export const defaultProjectIssueListOptions: ProjectIssueListOptions = {
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

export const defaultProjectIssueListViewConfig: ProjectIssueListViewConfig = {
  filters: defaultProjectIssueListFilters,
  sort: defaultProjectIssueListSort,
  groupBy: 'status',
  options: defaultProjectIssueListOptions,
}

export const dueBucketLabels: Record<ProjectIssueListDueBucket, string> = {
  overdue: 'Overdue',
  today: 'Today',
  this_week: 'Next 7 days',
  later: 'Later',
  no_due: 'No due date',
}

export const sortFieldLabels: Record<ProjectIssueListSortField, string> = {
  manual: 'Manual',
  title: 'Title',
  due_date: 'Due date',
  priority: 'Priority',
  status: 'Status',
  assignee: 'Assignee',
  created_at: 'Created',
  updated_at: 'Updated',
}

export const groupLabels: Record<ProjectIssueListGroupKey, string> = {
  status: 'Status',
  assignee: 'Assignee',
  priority: 'Priority',
  due_date: 'Due date',
  module: 'Module',
  cycle: 'Cycle',
  none: 'No grouping',
}

export const moduleStatusLabel: Record<ProjectModule['status'], string> = {
  backlog: 'Backlog',
  planned: 'Planned',
  in_progress: 'In Progress',
  completed: 'Completed',
  cancelled: 'Cancelled',
}

export const moduleStatusClass: Record<ProjectModule['status'], string> = {
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

const projectIssueListSortFields = new Set<ProjectIssueListSortField>(Object.keys(sortFieldLabels) as ProjectIssueListSortField[])
const projectIssueListGroupKeys = new Set<ProjectIssueListGroupKey>(Object.keys(groupLabels) as ProjectIssueListGroupKey[])
const projectIssueListDueBuckets = new Set<ProjectIssueListDueBucket>(Object.keys(dueBucketLabels) as ProjectIssueListDueBucket[])
const projectIssueListPriorities = new Set<IssuePriority>(issuePriorityOptions.map((priority) => priority.value))

export const getProfileDisplayName = (profile: IssueAssignee['profile'] | OrganisationMemberProfile['profile'] | null | undefined) =>
  profile?.full_name || profile?.username || profile?.email || 'User'

const isRecord = (value: unknown): value is Record<string, unknown> =>
  Boolean(value && typeof value === 'object' && !Array.isArray(value))

const readStringArray = <TValue extends string>(value: unknown, allowed?: Set<TValue>): TValue[] => {
  if (!Array.isArray(value)) return []
  return value.filter((item): item is TValue =>
    typeof item === 'string' && (!allowed || allowed.has(item as TValue)),
  )
}

const readBoolean = (value: unknown, fallback: boolean) =>
  typeof value === 'boolean' ? value : fallback

export const readListViewConfig = (metadata: ProjectTab['metadata'] | null | undefined): ProjectIssueListViewConfig => {
  const listView = isRecord(metadata?.listView) ? metadata.listView : {}
  const filters = isRecord(listView.filters) ? listView.filters : {}
  const sort = isRecord(listView.sort) ? listView.sort : {}
  const options = isRecord(listView.options) ? listView.options : {}
  const columns = isRecord(options.columns) ? options.columns : {}
  const sortField = typeof sort.field === 'string' && projectIssueListSortFields.has(sort.field as ProjectIssueListSortField)
    ? sort.field as ProjectIssueListSortField
    : defaultProjectIssueListSort.field
  const sortDirection = sort.direction === 'desc' || sort.direction === 'asc'
    ? sort.direction
    : defaultProjectIssueListSort.direction
  const groupBy = typeof listView.groupBy === 'string' && projectIssueListGroupKeys.has(listView.groupBy as ProjectIssueListGroupKey)
    ? listView.groupBy as ProjectIssueListGroupKey
    : defaultProjectIssueListViewConfig.groupBy

  return {
    filters: {
      query: typeof filters.query === 'string' ? filters.query : defaultProjectIssueListFilters.query,
      stateIds: readStringArray(filters.stateIds),
      assigneeIds: readStringArray(filters.assigneeIds),
      priorities: readStringArray(filters.priorities, projectIssueListPriorities),
      dueBuckets: readStringArray(filters.dueBuckets, projectIssueListDueBuckets),
      showCompleted: readBoolean(filters.showCompleted, defaultProjectIssueListFilters.showCompleted),
    },
    sort: {
      field: sortField,
      direction: sortDirection,
    },
    groupBy,
    options: {
      columns: {
        assignee: readBoolean(columns.assignee, defaultProjectIssueListOptions.columns.assignee),
        dueDate: readBoolean(columns.dueDate, defaultProjectIssueListOptions.columns.dueDate),
        effort: readBoolean(columns.effort, defaultProjectIssueListOptions.columns.effort),
        priority: readBoolean(columns.priority, defaultProjectIssueListOptions.columns.priority),
        status: readBoolean(columns.status, defaultProjectIssueListOptions.columns.status),
      },
      compactRows: readBoolean(options.compactRows, defaultProjectIssueListOptions.compactRows),
      wrapTitles: readBoolean(options.wrapTitles, defaultProjectIssueListOptions.wrapTitles),
      showIssueKeys: readBoolean(options.showIssueKeys, defaultProjectIssueListOptions.showIssueKeys),
      showEmptyGroups: readBoolean(options.showEmptyGroups, defaultProjectIssueListOptions.showEmptyGroups),
    },
  }
}

export const serializeListViewConfig = (config: ProjectIssueListViewConfig) => JSON.stringify(config)

export const cx = (...classes: Array<string | false | null | undefined>) => classes.filter(Boolean).join(' ')

const getDateKey = (date: Date) => date.toISOString().slice(0, 10)

export const getDueBucket = (issue: Issue, now = new Date()): ProjectIssueListDueBucket => {
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

export const createToggle = <TValue extends string>(value: TValue, values: TValue[]) =>
  values.includes(value) ? values.filter((item) => item !== value) : [...values, value]

export const isProjectIssueComplete = (issue: Issue) =>
  Boolean(issue.completed_at || issue.state?.group_key === 'completed' || issue.state?.name?.toLowerCase().includes('done') || issue.state?.name?.toLowerCase().includes('resolved'))

export const isProjectIssueStarted = (issue: Issue) =>
  ['started', 'in_progress'].includes(issue.state?.group_key ?? '') || ['in progress', 'investigating'].includes(issue.state?.name?.toLowerCase() ?? '')

const compareValues = (left: string | number, right: string | number, direction: ProjectIssueListSortDirection) => {
  const comparison = typeof left === 'number' && typeof right === 'number'
    ? left - right
    : String(left).localeCompare(String(right), undefined, { numeric: true, sensitivity: 'base' })
  return direction === 'asc' ? comparison : -comparison
}

export const buildIssueAssigneesByIssueId = (assignees: IssueAssignee[]) => {
  const map = new Map<string, IssueAssignee[]>()
  assignees.forEach((assignee) => {
    if (!assignee.issue_id) return
    const issueAssignees = map.get(assignee.issue_id) ?? []
    issueAssignees.push(assignee)
    map.set(assignee.issue_id, issueAssignees)
  })
  return map
}

export const buildModuleLinksByIssueId = (moduleIssueLinks: ModuleIssueLink[]) => {
  const map = new Map<string, ModuleIssueLink[]>()
  moduleIssueLinks.forEach((link) => {
    if (!link.issue_id) return
    const issueLinks = map.get(link.issue_id) ?? []
    issueLinks.push(link)
    map.set(link.issue_id, issueLinks)
  })
  return map
}

export const buildCycleLinkByIssueId = (cycleIssueLinks: CycleIssueLink[]) => {
  const map = new Map<string, CycleIssueLink>()
  cycleIssueLinks.forEach((link) => {
    if (!link.issue_id || map.has(link.issue_id)) return
    map.set(link.issue_id, link)
  })
  return map
}

export const getAssignableMembers = (members: OrganisationMemberProfile[], assignees: IssueAssignee[]) => {
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

export const filterProjectIssues = ({
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

export const sortProjectIssues = ({
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

export const groupProjectIssues = ({
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
