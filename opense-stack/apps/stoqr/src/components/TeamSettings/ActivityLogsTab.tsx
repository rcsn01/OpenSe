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

export const ActivityLogsTab = ({ logs }: { logs: ActivityEvent[] }) => {

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
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.length === 0 ? (
              <tr>
                <td colSpan={4} className="small muted" style={{ textAlign: 'center', padding: 24 }}>
                  No activity events found.
                </td>
              </tr>
            ) : logs.map((log) => (
              <tr key={log.id}>
                <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                  {formatDateTime(log.created_at)}
                </td>
                <td style={{ fontWeight: 500 }}>{log.profiles?.full_name ?? log.profiles?.username ?? 'System'}</td>
                <td>
                  <span className="pill">
                    {log.event_type}
                  </span>
                </td>
                <td className="small">{log.message ?? '—'}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
