import { useAlertDeliveryLogs } from '../../hooks/queries/useAlerts'
import { formatDateTime } from '../../utils'

export const DeliveryTab = ({ companyId }: { companyId: string }) => {
  const { data: logs = [], isLoading } = useAlertDeliveryLogs(companyId)

  const sentCount = logs.filter((log) => log.status === 'sent').length
  const failedCount = logs.filter((log) => log.status === 'failed').length

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card stat">
          <h3>Email / Push Notifications Sent</h3>
          <div className="value">{sentCount}</div>
        </div>
        <div className="card stat">
          <h3>Delivery Failures</h3>
          <div className="value">{failedCount}</div>
        </div>
      </div>

      <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Notification Delivery Log</h3>
          <div className="small muted">Recent email/push/in-app deliveries.</div>
        </div>
        {isLoading ? (
          <div className="empty-state">Loading delivery logs...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No delivery log entries yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Sent At</th>
                  <th>Channel</th>
                  <th>Recipient</th>
                  <th>Status</th>
                  <th>Alert</th>
                  <th>Error</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <tr key={log.id}>
                    <td className="small muted">{log.sent_at ? formatDateTime(log.sent_at) : '—'}</td>
                    <td><span className="pill">{log.channel}</span></td>
                    <td>{log.recipient ?? '—'}</td>
                    <td>{log.status}</td>
                    <td className="small muted">{log.alert_events?.message ?? '—'}</td>
                    <td className="small muted">{log.error_message ?? '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
