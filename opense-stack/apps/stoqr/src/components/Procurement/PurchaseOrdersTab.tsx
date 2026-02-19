import { useState } from 'react'
import { EmptyState } from '../EmptyState'
import { formatDateTime } from '../../utils'
import {
  useCreatePurchaseOrder,
  useProcurementPurchaseOrders,
  useProcurementSuppliers,
} from '../../hooks/queries/useProcurementTabs'

export const PurchaseOrdersTab = ({ companyId }: { companyId: string }) => {
  const [isCreating, setIsCreating] = useState(false)
  const { data: pos = [], isLoading: loading } = useProcurementPurchaseOrders(companyId)
  const { data: suppliers = [] } = useProcurementSuppliers(companyId)
  const createPurchaseOrderMutation = useCreatePurchaseOrder(companyId)

  const [newPoSupplier, setNewPoSupplier] = useState('')
  const [newPoDate, setNewPoDate] = useState('')

  const handleCreatePO = async () => {
    if (!newPoSupplier) return
    try {
      await createPurchaseOrderMutation.mutateAsync({
        supplierId: newPoSupplier,
        expectedDate: newPoDate,
      })
      setIsCreating(false)
    } catch {
      // keep current UX silent on error
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'draft':
        return <span className="pill">Draft</span>
      case 'sent':
        return <span className="badge warning">On Order</span>
      case 'partial':
        return <span className="badge warning">Partial</span>
      case 'closed':
        return <span className="badge success">Received</span>
      default:
        return <span className="pill">{status}</span>
    }
  }

  return (
    <div className="stack">
      {isCreating ? (
        <div className="card stack" style={{ maxWidth: 500 }}>
          <h3 className="section-title">New Purchase Order</h3>
          <label className="stack">
            Supplier
            <select className="select" value={newPoSupplier} onChange={(e) => setNewPoSupplier(e.target.value)}>
              <option value="">Select a supplier...</option>
              {suppliers.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
          </label>
          <label className="stack">
            Expected Date
            <input type="date" className="input" value={newPoDate} onChange={(e) => setNewPoDate(e.target.value)} />
          </label>
          <div className="row">
            <button className="button" onClick={handleCreatePO}>Create Draft</button>
            <button className="button ghost" onClick={() => setIsCreating(false)}>Cancel</button>
          </div>
        </div>
      ) : (
        <div className="flex-between">
          <h3 className="section-title">Active Orders</h3>
          <button className="button" onClick={() => setIsCreating(true)}>+ New Purchase Order</button>
        </div>
      )}

      {loading ? (
        <div className="empty-state">Loading orders...</div>
      ) : pos.length === 0 ? (
        <EmptyState title="No Purchase Orders" description="Create a PO to track incoming stock." />
      ) : (
        <div className="card" style={{ padding: 0 }}>
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
                {pos.map((po) => (
                  <tr key={po.id}>
                    <td style={{ fontWeight: 600 }}>#{po.po_number}</td>
                    <td>{po.suppliers?.name ?? 'Unknown'}</td>
                    <td>{getStatusBadge(po.status)}</td>
                    <td>{po.expected_date ?? '—'}</td>
                    <td className="muted small">{formatDateTime(po.created_at)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
