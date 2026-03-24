import { useScanHistory } from '../../hooks/queries/useQuickScan'

export const ScanHistoryTab = ({ companyId }: { companyId: string }) => {
  const { data = [], isLoading } = useScanHistory(companyId)

  if (isLoading) {
    return <div className="empty-state">Loading scan history...</div>
  }

  if (!data.length) {
    return <div className="empty-state">No scan history yet.</div>
  }

  return (
    <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Scan History Log</h3>
        <div className="small muted">Recent scanner events across manual and camera modes.</div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>Type</th>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Qty</th>
              <th>Method</th>
              <th>User</th>
            </tr>
          </thead>
          <tbody>
            {data.map((event) => (
              <tr key={event.id}>
                <td className="small muted">{new Date(event.created_at).toLocaleString()}</td>
                <td><span className="pill">{event.scan_type.replace('_', ' ')}</span></td>
                <td>
                  <div>{event.product?.name ?? 'Unknown item'}</div>
                  <div className="small muted">{event.product?.sku ?? event.barcode ?? '—'}</div>
                </td>
                <td style={{ textAlign: 'right', fontWeight: 'var(--type-weight-semibold)' }}>{event.quantity ?? 0}</td>
                <td className="small muted">{event.entry_method}</td>
                <td className="small muted">{event.actorName}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
