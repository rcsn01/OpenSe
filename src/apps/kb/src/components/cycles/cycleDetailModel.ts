import type { Cycle, CycleIssueLink, Issue } from '../../types'
import { formatShortDate, toDate } from '../../lib/dateFormatting'
import { isProjectIssueComplete, isProjectIssueStarted } from '../projects/project-list/projectIssueListLogic'

export type CycleDetailModel = {
  cycle: Cycle
  issues: Issue[]
  total: number
  completed: number
  pending: number
  started: number
  backlog: number
  progress: number
}

export const buildCycleDetailModel = (cycle: Cycle, issues: Issue[], cycleIssueLinks: CycleIssueLink[]): CycleDetailModel => {
  const issueById = new Map(issues.map((issue) => [issue.id, issue]))
  const linkedIssueIds = new Set(
    cycleIssueLinks
      .filter((link) => link.cycle_id === cycle.id && link.issue_id)
      .map((link) => link.issue_id as string),
  )
  const linkedIssues = [...linkedIssueIds]
    .map((issueId) => issueById.get(issueId))
    .filter((issue): issue is Issue => Boolean(issue))
  const completed = linkedIssues.filter(isProjectIssueComplete).length
  const started = linkedIssues.filter((issue) => !isProjectIssueComplete(issue) && isProjectIssueStarted(issue)).length
  const pending = linkedIssues.filter((issue) => !isProjectIssueComplete(issue)).length
  const backlog = linkedIssues.filter((issue) => issue.state?.group_key === 'backlog').length

  return {
    cycle,
    issues: linkedIssues,
    total: linkedIssues.length,
    completed,
    pending,
    started,
    backlog,
    progress: linkedIssues.length > 0 ? Math.round((completed / linkedIssues.length) * 100) : 0,
  }
}

export const formatCycleDateRange = (cycle: Cycle) => {
  if (!cycle.starts_at && !cycle.ends_at) return 'No dates'
  const start = cycle.starts_at ? formatShortDate(cycle.starts_at) : 'No start'
  const end = cycle.ends_at ? formatShortDate(cycle.ends_at) : 'No end'
  return `${start} - ${end}`
}

export const getCycleDateBounds = (cycle: Cycle) => {
  const start = toDate(cycle.starts_at) ?? new Date()
  const end = toDate(cycle.ends_at) ?? new Date(start.getTime() + 14 * 86_400_000)
  return { start, end }
}
