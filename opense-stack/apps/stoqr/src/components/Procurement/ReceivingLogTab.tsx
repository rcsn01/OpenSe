import { EmptyState } from '../EmptyState'
import { formatDateTime } from '../../utils'
import { useProcurementReceivingLogs } from '../../hooks/queries/useProcurementTabs'

export const ReceivingLogTab = ({ companyId }: { companyId: string }) => {
  const { data: logs = [], isLoading: loading } = useProcurementReceivingLogs(companyId)

  return (
    <div className="card stack">
      <h3 className="section-title">Recent Receipts</h3>
      {loading ? (
        <div className="empty-state">Loading logs...</div>
      ) : logs.length === 0 ? (
        <EmptyState title="No Receipts" description="Items received against POs will appear here." />
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Date</th>
                <th>PO #</th>
                <th>Item</th>
                <th>Qty</th>
                <th>Receiver</th>
              </tr>
            </thead>
            <tbody>
              {logs.map((log, i) => (
                <tr key={i}>
                  <td className="small muted">{formatDateTime(log.received_at)}</td>
                  <td>{log.purchase_orders ? `#${log.purchase_orders.po_number}` : '—'}</td>
                  <td>
                    <div style={{ fontWeight: 500 }}>{log.products?.name ?? 'Unknown'}</div>
                    <div className="small muted">{log.products?.sku}</div>
                  </td>
                  <td><span className="badge success">+{log.quantity_received}</span></td>
                  <td className="small">{log.profiles?.full_name ?? log.profiles?.username}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
