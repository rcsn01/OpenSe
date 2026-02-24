import { formatDateTime } from '../../utils'
import { useProcurementPurchaseOrderItems, useProcurementPurchaseOrders } from '../../hooks/queries/useProcurementTabs'

export const OrderTrackingTab = ({ companyId }: { companyId: string }) => {
  const { data: purchaseOrders = [], isLoading: loadingOrders } = useProcurementPurchaseOrders(companyId)
  const { data: items = [], isLoading: loadingItems } = useProcurementPurchaseOrderItems(companyId)

  const activeOrders = purchaseOrders.filter((order) => ['draft', 'sent', 'partial'].includes(order.status))

  const progressByPo = new Map<string, { ordered: number; received: number }>()
  for (const item of items) {
    const existing = progressByPo.get(item.po_id) ?? { ordered: 0, received: 0 }
    existing.ordered += item.quantity_ordered
    existing.received += item.quantity_received
    progressByPo.set(item.po_id, existing)
  }

  return (
    <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Order Tracking</h3>
        <div className="small muted">Track open purchase orders and receipt progress.</div>
      </div>
      {loadingOrders || loadingItems ? (
        <div className="empty-state">Loading order tracking...</div>
      ) : activeOrders.length === 0 ? (
        <div className="empty-state">No active purchase orders.</div>
      ) : (
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>PO #</th>
                <th>Supplier</th>
                <th>Status</th>
                <th>Expected</th>
                <th style={{ textAlign: 'right' }}>Progress</th>
                <th>Created</th>
              </tr>
            </thead>
            <tbody>
              {activeOrders.map((order) => {
                const progress = progressByPo.get(order.id) ?? { ordered: 0, received: 0 }
                const pct = progress.ordered > 0 ? Math.min((progress.received / progress.ordered) * 100, 100) : 0
                return (
                  <tr key={order.id}>
                    <td style={{ fontWeight: 600 }}>#{order.po_number}</td>
                    <td>{order.suppliers?.name ?? 'Unknown'}</td>
                    <td><span className="pill">{order.status}</span></td>
                    <td>{order.expected_date ?? '—'}</td>
                    <td style={{ textAlign: 'right' }}>{progress.received}/{progress.ordered} ({pct.toFixed(0)}%)</td>
                    <td className="small muted">{formatDateTime(order.created_at)}</td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
