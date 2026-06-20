import { db } from '../supabaseClient'
import type { AnalyticsBreakdownItem, IssuePriority, OpenKbAnalyticsSummary } from '../types'

type IssueAnalyticsRow = {
  id: string
  project_id: string
  priority: IssuePriority
  state_id: string | null
  created_at: string
  target_date: string | null
  completed_at: string | null
  project: { id: string; name: string; identifier: string } | { id: string; name: string; identifier: string }[] | null
  state: { id: string; name: string; group_key: string; color: string } | { id: string; name: string; group_key: string; color: string }[] | null
}

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const priorityLabels: Record<IssuePriority, string> = {
  none: 'None',
  low: 'Low',
  medium: 'Medium',
  high: 'High',
  urgent: 'Urgent',
}

const priorityColors: Record<IssuePriority, string> = {
  none: '#64748b',
  low: '#2563eb',
  medium: '#ca8a04',
  high: '#dc2626',
  urgent: '#991b1b',
}

const increment = (map: Map<string, AnalyticsBreakdownItem>, id: string, label: string, color?: string) => {
  const current = map.get(id)
  if (current) {
    current.value += 1
    return
  }
  map.set(id, { id, label, value: 1, color })
}

const countTable = async (table: string, organisationId: string) => {
  const { count, error } = await db
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)

  if (error) throw error
  return count ?? 0
}

const buildTrend = (issues: IssueAnalyticsRow[], dateSelector: (issue: IssueAnalyticsRow) => string | null) => {
  const days = Array.from({ length: 14 }, (_item, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (13 - index))
    return date.toISOString().slice(0, 10)
  })
  const counts = new Map(days.map((date) => [date, 0]))

  issues.forEach((issue) => {
    const date = dateSelector(issue)?.slice(0, 10)
    if (date && counts.has(date)) {
      counts.set(date, (counts.get(date) ?? 0) + 1)
    }
  })

  return days.map((date) => ({ date, issues: counts.get(date) ?? 0 }))
}

const daysBetween = (start: string, end: string) => {
  const startTime = new Date(start).getTime()
  const endTime = new Date(end).getTime()
  return Math.max(0, Math.round((endTime - startTime) / 86_400_000))
}

export const fetchAnalyticsSummary = async (organisationId: string): Promise<OpenKbAnalyticsSummary> => {
  const [
    projects,
    pages,
    cycles,
    modules,
    intakeRequests,
    issueRows,
  ] = await Promise.all([
    countTable('projects', organisationId),
    countTable('pages', organisationId),
    countTable('cycles', organisationId),
    countTable('modules', organisationId),
    countTable('intake_issues', organisationId),
    db
      .from('issues')
      .select(`
        id,
        project_id,
        priority,
        state_id,
        created_at,
        target_date,
        completed_at,
        project:projects(id, name, identifier),
        state:states(id, name, group_key, color)
      `)
      .eq('organisation_id', organisationId)
      .is('deleted_at', null),
  ])

  if (issueRows.error) throw issueRows.error

  const issues = (issueRows.data ?? []) as unknown as IssueAnalyticsRow[]
  const byPriority = new Map<string, AnalyticsBreakdownItem>()
  const byState = new Map<string, AnalyticsBreakdownItem>()
  const byProject = new Map<string, AnalyticsBreakdownItem>()
  const byDueBucket = new Map<string, AnalyticsBreakdownItem>()
  const completionAges: number[] = []
  let completed = 0
  let overdue = 0
  let dueSoon = 0
  const today = new Date().toISOString().slice(0, 10)
  const soon = new Date()
  soon.setDate(soon.getDate() + 7)
  const soonDate = soon.toISOString().slice(0, 10)

  issues.forEach((issue) => {
    const state = normalizeSingle(issue.state)
    const project = normalizeSingle(issue.project)
    const isCompleted = Boolean(issue.completed_at || state?.group_key === 'completed')
    increment(byPriority, issue.priority, priorityLabels[issue.priority], priorityColors[issue.priority])
    increment(byState, issue.state_id ?? 'none', state?.name ?? 'No state', state?.color ?? '#64748b')
    increment(byProject, issue.project_id, project ? `${project.identifier} · ${project.name}` : 'Unknown project')
    if (isCompleted) {
      completed += 1
      if (issue.completed_at) completionAges.push(daysBetween(issue.created_at, issue.completed_at))
    }

    if (!issue.target_date) {
      increment(byDueBucket, 'none', 'No target', '#64748b')
    } else if (!isCompleted && issue.target_date < today) {
      overdue += 1
      increment(byDueBucket, 'overdue', 'Overdue', '#dc2626')
    } else if (!isCompleted && issue.target_date <= soonDate) {
      dueSoon += 1
      increment(byDueBucket, 'due_soon', 'Due in 7 days', '#ca8a04')
    } else if (isCompleted) {
      increment(byDueBucket, 'completed', 'Completed', '#16a34a')
    } else {
      increment(byDueBucket, 'future', 'Future', '#2563eb')
    }
  })
  const averageCompletionDays = completionAges.length > 0
    ? Math.round(completionAges.reduce((sum, value) => sum + value, 0) / completionAges.length)
    : null

  return {
    total_projects: projects,
    total_issues: issues.length,
    open_issues: issues.length - completed,
    completed_issues: completed,
    total_pages: pages,
    total_cycles: cycles,
    total_modules: modules,
    total_intake_requests: intakeRequests,
    overdue_issues: overdue,
    due_soon_issues: dueSoon,
    average_completion_days: averageCompletionDays,
    issues_by_priority: Array.from(byPriority.values()),
    issues_by_state: Array.from(byState.values()),
    issues_by_project: Array.from(byProject.values()),
    issues_by_due_bucket: Array.from(byDueBucket.values()),
    issue_creation_trend: buildTrend(issues, (issue) => issue.created_at),
    issue_completion_trend: buildTrend(issues, (issue) => issue.completed_at).map((item) => ({
      date: item.date,
      issues: item.issues,
      completed: item.issues,
    })),
  }
}
