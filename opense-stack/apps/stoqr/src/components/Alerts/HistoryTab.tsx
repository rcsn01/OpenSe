import { useAlertEvents, useUpdateAlertEventStatus } from '../../hooks/queries/useAlerts'
import { formatDateTime } from '../../utils'

export const HistoryTab = ({ companyId }: { companyId: string }) => {
  const { data: events = [], isLoading } = useAlertEvents(companyId)
  const updateStatusMutation = useUpdateAlertEventStatus(companyId)

  return (
    <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Alert History</h3>
        <div className="small muted">Status updates: open, acknowledged, resolved.</div>
      </div>
      {isLoading ? (
        <div className="empty-state">Loading alert history...</div>
      ) : events.length === 0 ? (
        <div className="empty-state">No alert events yet.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Triggered</th>
                <th>Type</th>
                <th>Severity</th>
                <th>Message</th>
                <th>Status</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {events.map((event) => (
                <tr key={event.id}>
                  <td className="small muted">{formatDateTime(event.triggered_at)}</td>
                  <td><span className="pill">{event.alert_type}</span></td>
                  <td>{event.severity}</td>
                  <td>
                    <div>{event.message}</div>
                    <div className="small muted">{event.products?.name ?? '—'} {event.products?.sku ? `(${event.products.sku})` : ''}</div>
                  </td>
                  <td>{event.status}</td>
                  <td>
                    <div className="row" style={{ gap: 8 }}>
                      <button
                        className="button ghost small"
                        disabled={event.status !== 'open' || updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ eventId: event.id, status: 'acknowledged' })}
                      >
                        Ack
                      </button>
                      <button
                        className="button ghost small"
                        disabled={event.status === 'resolved' || updateStatusMutation.isPending}
                        onClick={() => updateStatusMutation.mutate({ eventId: event.id, status: 'resolved' })}
                      >
                        Resolve
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
