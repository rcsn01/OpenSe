import { useMemo } from 'react'
import { DataTable } from '@repo/ui'
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
    <div className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-between">
          <h3 className="section-title" style={{ margin: 0 }}>Activity Logs</h3>
          <button className="button ghost small" onClick={() => window.print()}>Export Logs</button>
        </div>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          Global feed of system access, permission changes, and administrative actions.
        </p>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          Showing {filteredLogs.length} of {logs.length} events.
        </p>
      </div>
      <DataTable
        columns={[
          {
            id: 'timestamp',
            header: 'Timestamp',
            renderCell: (log: ActivityEvent) => (
              <span className="small muted" style={{ whiteSpace: 'nowrap' }}>
                {formatDateTime(log.created_at)}
              </span>
            ),
          },
          {
            id: 'user',
            header: 'User',
            renderCell: (log: ActivityEvent) => (
              <span style={{ fontWeight: 'var(--type-weight-medium)' }}>
                {log.profiles?.full_name ?? log.profiles?.username ?? 'System'}
              </span>
            ),
          },
          {
            id: 'action',
            header: 'Action',
            renderCell: (log: ActivityEvent) => (
              <span className="pill">{log.event_type}</span>
            ),
          },
          {
            id: 'details',
            header: 'Details',
            renderCell: (log: ActivityEvent) => <span className="small">{log.message ?? '—'}</span>,
          },
        ]}
        rows={filteredLogs}
        getRowId={(log) => log.id}
        emptyState={normalizedSearchTerm.length > 0 ? `No activity events matched "${normalizedSearchTerm}".` : 'No activity events found.'}
        tableWrapClassName="border-0 rounded-none"
      />
    </div>
  )
}
