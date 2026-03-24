import { formatDateTime } from '../../utils'
import { useProcurementOrderHistory, useProcurementReceivingLogs } from '../../hooks/queries/useProcurementTabs'

export const OrderHistoryTab = ({ companyId }: { companyId: string }) => {
  const { data: history = [], isLoading: loadingHistory } = useProcurementOrderHistory(companyId)
  const { data: logs = [], isLoading: loadingLogs } = useProcurementReceivingLogs(companyId)

  return (
    <div className="stack">
      <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Order History</h3>
          <div className="small muted">Closed and cancelled purchase orders.</div>
        </div>
        {loadingHistory ? (
          <div className="empty-state">Loading order history...</div>
        ) : history.length === 0 ? (
          <div className="empty-state">No historical purchase orders yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Supplier</th>
                  <th>Status</th>
                  <th>Expected</th>
                  <th>Created</th>
                </tr>
              </thead>
              <tbody>
                {history.map((order) => (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 'var(--type-weight-semibold)' }}>#{order.po_number}</td>
                    <td>{order.suppliers?.name ?? 'Unknown'}</td>
                    <td><span className="pill">{order.status}</span></td>
                    <td>{order.expected_date ?? '—'}</td>
                    <td className="small muted">{formatDateTime(order.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Recent Receipts</h3>
          <div className="small muted">Latest receiving activity across purchase orders.</div>
        </div>
        {loadingLogs ? (
          <div className="empty-state">Loading receiving activity...</div>
        ) : logs.length === 0 ? (
          <div className="empty-state">No receiving activity yet.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>PO #</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Qty</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 15).map((log) => (
                  <tr key={log.id ?? `${log.received_at}-${log.quantity_received}`}>
                    <td className="small muted">{formatDateTime(log.received_at)}</td>
                    <td>{log.purchase_orders ? `#${log.purchase_orders.po_number}` : '—'}</td>
                    <td>{log.products?.name ?? 'Unknown'} <span className="small muted">{log.products?.sku ?? '—'}</span></td>
                    <td style={{ textAlign: 'right' }}>+{log.quantity_received}</td>
                    <td className="small muted">{log.notes ?? '—'}</td>
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
