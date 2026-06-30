import type { Issue } from '../types'
import type { buildBoardColumns } from './issueViews'

export type BoardColumn = ReturnType<typeof buildBoardColumns>[number]

export const getIssueColumnId = (issue: Pick<Issue, 'state_id'>) => issue.state_id ?? 'none'

export const columnIdToStateId = (columnId: string): string | null => (columnId === 'none' ? null : columnId)

export const findIssueInColumns = (issueId: string, columns: BoardColumn[]) => {
  for (const column of columns) {
    const issue = column.issues.find((item) => item.id === issueId)
    if (issue) {
      return { issue, columnId: column.id }
    }
  }
  return null
}

export const findColumnIdForIssue = (issueId: string, columns: BoardColumn[]) => {
  for (const column of columns) {
    if (column.issues.some((item) => item.id === issueId)) {
      return column.id
    }
  }
  return null
}

export const resolveOverColumnId = (overId: string | null | undefined, columns: BoardColumn[]) => {
  if (!overId) return null
  if (columns.some((column) => column.id === overId)) return overId
  return findColumnIdForIssue(overId, columns)
}

export const resolveBoardDrop = ({
  activeIssueId,
  overColumnId,
  columns,
}: {
  activeIssueId: string
  overColumnId: string | null | undefined
  columns: BoardColumn[]
}) => {
  const resolvedColumnId = resolveOverColumnId(overColumnId, columns)
  if (!resolvedColumnId) return null

  const source = findIssueInColumns(activeIssueId, columns)
  if (!source) return null

  const nextStateId = columnIdToStateId(resolvedColumnId)
  const currentStateId = source.issue.state_id ?? null

  if (source.columnId === resolvedColumnId || currentStateId === nextStateId) {
    return null
  }

  return {
    issueId: activeIssueId,
    nextStateId,
  }
}

export const applyBoardDrop = (columns: BoardColumn[], issueId: string, nextStateId: string | null): BoardColumn[] => {
  let movedIssue: Issue | null = null

  const withoutIssue = columns.map((column) => {
    const issue = column.issues.find((item) => item.id === issueId)
    if (!issue) return column

    movedIssue = { ...issue, state_id: nextStateId }
    return {
      ...column,
      issues: column.issues.filter((item) => item.id !== issueId),
    }
  })

  if (!movedIssue) return columns

  const targetColumnId = nextStateId ?? 'none'
  return withoutIssue.map((column) => (
    column.id === targetColumnId
      ? { ...column, issues: [...column.issues, movedIssue!] }
      : column
  ))
}
