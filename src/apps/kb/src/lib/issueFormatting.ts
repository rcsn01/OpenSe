import type { Issue, IssuePriority } from '../types'

export const issuePriorityTone: Record<IssuePriority, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  none: 'neutral',
  low: 'info',
  medium: 'warning',
  high: 'danger',
  urgent: 'danger',
}

export const issuePriorityOptions: Array<{ value: IssuePriority; label: string }> = [
  { value: 'none', label: 'None' },
  { value: 'low', label: 'Low' },
  { value: 'medium', label: 'Medium' },
  { value: 'high', label: 'High' },
  { value: 'urgent', label: 'Urgent' },
]

export const isIssuePriority = (value: string | null): value is IssuePriority =>
  Boolean(value && issuePriorityOptions.some((option) => option.value === value))

export const formatIssueKey = (issue: Pick<Issue, 'sequence_id' | 'project'> | null | undefined) =>
  issue ? `${issue.project?.identifier ?? 'KB'}-${issue.sequence_id ?? '?'}` : 'Unknown'
