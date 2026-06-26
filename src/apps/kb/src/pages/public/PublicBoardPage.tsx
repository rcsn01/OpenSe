import { useMemo } from 'react'
import { Link, useParams } from 'react-router-dom'
import { Badge, EmptyState } from '@repo/ui'
import { ClipboardList } from 'lucide-react'
import { usePublicDeployBoard, usePublicDeployBoardIssues } from '../../hooks/queries/useDeployBoards'
import type { IssuePriority } from '../../types'

const priorityTone: Record<IssuePriority, 'neutral' | 'success' | 'warning' | 'danger' | 'info'> = {
  none: 'neutral',
  low: 'info',
  medium: 'warning',
  high: 'danger',
  urgent: 'danger',
}

export const PublicBoardPage = () => {
  const { slug = null } = useParams()
  const { data: board, isLoading: boardLoading } = usePublicDeployBoard(slug)
  const { data: issues = [], isLoading: issuesLoading } = usePublicDeployBoardIssues(slug)

  const groupedIssues = useMemo(() => {
    const groups = new Map<string, typeof issues>()
    issues.forEach((issue) => {
      const groupName = issue.state_name ?? 'No state'
      groups.set(groupName, [...(groups.get(groupName) ?? []), issue])
    })
    return [...groups.entries()]
  }, [issues])

  if (boardLoading || issuesLoading) {
    return <EmptyState title="Loading board..." description="" />
  }

  if (!board) {
    return (
      <main className="min-h-screen bg-[var(--color-background)] p-6 text-[var(--color-foreground)]">
        <EmptyState title="Board not available" description="This public board is disabled, private, or does not exist." />
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]">
      <header className="border-b border-[var(--color-border)] bg-[var(--color-surface)]">
        <div className="mx-auto flex max-w-7xl flex-wrap items-center justify-between gap-4 px-4 py-5 md:px-6">
          <div className="min-w-0">
            <div className="flex flex-wrap items-center gap-2">
              <Badge variant="outline">{board.project_identifier}</Badge>
              <Badge variant="success">public</Badge>
            </div>
            <h1 className="mt-3 truncate text-2xl font-semibold tracking-normal">{board.title}</h1>
            <p className="mt-1 max-w-3xl text-sm text-[var(--color-muted-foreground)]">
              {board.description_text || board.project_description_text || board.project_name}
            </p>
          </div>
          <Link
            className="inline-flex h-9 items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-background)] px-3 text-sm font-medium hover:bg-[var(--color-muted)]"
            to="/"
          >
            <ClipboardList className="h-4 w-4" />
            Open-KB
          </Link>
        </div>
      </header>

      <section className="mx-auto max-w-7xl px-4 py-6 md:px-6">
        {issues.length === 0 ? (
          <EmptyState title="No public issues" description="" />
        ) : (
          <div className="grid gap-4 lg:grid-cols-3">
            {groupedIssues.map(([groupName, groupIssues]) => (
              <section key={groupName} className="min-w-0 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-surface)]">
                <div className="flex h-11 items-center justify-between border-b border-[var(--color-border)] px-4">
                  <h2 className="truncate text-sm font-semibold">{groupName}</h2>
                  <Badge variant="neutral">{groupIssues.length}</Badge>
                </div>
                <div className="divide-y divide-[var(--color-border)]">
                  {groupIssues.map((issue) => (
                    <article key={issue.issue_id} className="p-4">
                      <div className="flex items-start justify-between gap-3">
                        <span className="font-mono text-xs text-[var(--color-muted-foreground)]">
                          {board.project_identifier}-{issue.sequence_id ?? '?'}
                        </span>
                        <Badge variant={priorityTone[issue.priority]}>{issue.priority}</Badge>
                      </div>
                      <h3 className="mt-2 line-clamp-2 text-sm font-semibold">{issue.title}</h3>
                      {issue.description_text ? (
                        <p className="mt-2 line-clamp-3 text-xs text-[var(--color-muted-foreground)]">{issue.description_text}</p>
                      ) : null}
                      {issue.target_date ? (
                        <div className="mt-3 text-xs text-[var(--color-muted-foreground)]">Target {issue.target_date}</div>
                      ) : null}
                    </article>
                  ))}
                </div>
              </section>
            ))}
          </div>
        )}
      </section>
    </main>
  )
}
