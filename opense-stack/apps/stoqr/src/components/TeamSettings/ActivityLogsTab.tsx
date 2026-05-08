import { useMemo } from 'react'
import { Badge, Button, DataTable } from '@repo/ui'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'
import { formatDateTime } from '../../utils'

type ActivityEvent = {
  id: string
  actor_user_id: string | null
  event_type: string
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles?: { id: string; full_name: string | null; username: string | null } | null
}

export const ActivityLogsTab = ({ logs, searchTerm = '' }: { logs: ActivityEvent[]; searchTerm?: string }) => {
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)
  const filteredLogs = useMemo(
    () => fuzzySearchItems(logs, normalizedSearchTerm, [
      {
        key: (log) => log.event_type,
        maxRanking: fuzzyRankings.STARTS_WITH,
      },
      {
        key: (log) => log.message ?? '',
        maxRanking: fuzzyRankings.CONTAINS,
      },
      {
        key: (log) => [log.profiles?.full_name ?? '', log.profiles?.username ?? ''],
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
    ]),
    [logs, normalizedSearchTerm],
  )

  return (
    <div className="flex min-h-0 flex-col overflow-hidden">
      <div className="border-b border-[var(--color-border)] px-5 pb-3 pt-5">
        <div className="flex items-center justify-between gap-3">
          <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Activity Logs</h3>
          <Button variant="ghost" size="sm" onClick={() => window.print()}>
            Export Logs
          </Button>
        </div>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Global feed of system access, permission changes, and administrative actions.
        </p>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Showing {filteredLogs.length} of {logs.length} events.
        </p>
      </div>
      <DataTable
        columns={[
          {
            id: 'timestamp',
            header: 'Timestamp',
            renderCell: (log: ActivityEvent) => (
              <span className="whitespace-nowrap text-sm text-[var(--color-muted-foreground)]">
                {formatDateTime(log.created_at)}
              </span>
            ),
          },
          {
            id: 'user',
            header: 'User',
            renderCell: (log: ActivityEvent) => (
              <span className="font-medium text-[var(--color-foreground)]">
                {log.profiles?.full_name ?? log.profiles?.username ?? 'System'}
              </span>
            ),
          },
          {
            id: 'action',
            header: 'Action',
            renderCell: (log: ActivityEvent) => (
              <Badge variant="neutral">{log.event_type}</Badge>
            ),
          },
          {
            id: 'details',
            header: 'Details',
            renderCell: (log: ActivityEvent) => <span className="text-sm text-[var(--color-foreground)]">{log.message ?? '—'}</span>,
          },
        ]}
        rows={filteredLogs}
        getRowId={(log) => log.id}
        emptyState={normalizedSearchTerm.length > 0 ? `No activity events matched "${normalizedSearchTerm}".` : 'No activity events found.'}
      />
    </div>
  )
}
