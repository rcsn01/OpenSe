import type { Issue, IssueState } from '../types'

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

