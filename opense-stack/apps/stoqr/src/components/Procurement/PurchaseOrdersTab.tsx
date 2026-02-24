import { useState } from 'react'
import { EmptyState } from '../EmptyState'
import { formatDateTime } from '../../utils'
import {
  useCreatePurchaseOrderItem,
  useCreatePurchaseOrder,
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
  useProcurementSuppliers,
} from '../../hooks/queries/useProcurementTabs'

export const PurchaseOrdersTab = ({
  companyId,
  products,
}: {
  companyId: string
  products: Array<{ id: string; name: string; sku: string }>
}) => {
  const [isCreating, setIsCreating] = useState(false)
  const { data: pos = [], isLoading: loading } = useProcurementPurchaseOrders(companyId)
  const { data: items = [] } = useProcurementPurchaseOrderItems(companyId)
  const { data: suppliers = [] } = useProcurementSuppliers(companyId)
  const createPurchaseOrderMutation = useCreatePurchaseOrder(companyId)
  const createPurchaseOrderItemMutation = useCreatePurchaseOrderItem(companyId)

  const [newPoSupplier, setNewPoSupplier] = useState('')
  const [newPoDate, setNewPoDate] = useState('')
  const [linePoId, setLinePoId] = useState('')
  const [lineProductId, setLineProductId] = useState('')
  const [lineQty, setLineQty] = useState(1)
  const [lineCost, setLineCost] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  const handleCreatePO = async () => {
    if (!newPoSupplier) return
    try {
      setMessage(null)
      await createPurchaseOrderMutation.mutateAsync({
        supplierId: newPoSupplier,
        expectedDate: newPoDate,
      })
      setIsCreating(false)
      setNewPoSupplier('')
      setNewPoDate('')
      setMessage('Purchase order draft created.')
    } catch {
      setMessage('Failed to create purchase order.')
    }
  }

  const handleAddLineItem = async () => {
    if (!linePoId || !lineProductId || lineQty <= 0) return

    try {
      setMessage(null)
      await createPurchaseOrderItemMutation.mutateAsync({
        poId: linePoId,
        productId: lineProductId,
        quantityOrdered: lineQty,
        unitCost: lineCost,
      })
      setLineProductId('')
      setLineQty(1)
      setLineCost(0)
      setMessage('Line item added.')
    } catch {
      setMessage('Failed to add line item.')
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
          {message && <div className="small muted">{message}</div>}
        </div>
      ) : (
        <div className="flex-between">
          <h3 className="section-title">Active Orders</h3>
          <button className="button" onClick={() => setIsCreating(true)}>+ New Purchase Order</button>
        </div>
      )}

      {pos.length > 0 && (
        <div className="card stack" style={{ maxWidth: 700 }}>
          <h3 className="section-title">Add PO Line Item</h3>
          <div className="grid grid-2">
            <label className="stack">
              Purchase Order
              <select className="select" value={linePoId} onChange={(e) => setLinePoId(e.target.value)}>
                <option value="">Select PO...</option>
                {pos.map((po) => (
                  <option key={po.id} value={po.id}>#{po.po_number} · {po.suppliers?.name ?? 'Unknown Supplier'}</option>
                ))}
              </select>
            </label>
            <label className="stack">
              Product
              <select className="select" value={lineProductId} onChange={(e) => setLineProductId(e.target.value)}>
                <option value="">Select product...</option>
                {products.map((product) => (
                  <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
                ))}
              </select>
            </label>
            <label className="stack">
              Quantity Ordered
              <input className="input" type="number" min={1} value={lineQty} onChange={(e) => setLineQty(Number(e.target.value) || 1)} />
            </label>
            <label className="stack">
              Unit Cost
              <input className="input" type="number" min={0} step="0.01" value={lineCost} onChange={(e) => setLineCost(Number(e.target.value) || 0)} />
            </label>
          </div>
          <button className="button" onClick={handleAddLineItem}>Add Line Item</button>
          {message && <div className="small muted">{message}</div>}
        </div>
      )}

      {items.length > 0 && (
        <div className="card stack">
          <h3 className="section-title">Current PO Items</h3>
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>PO</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Ordered</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {items.slice(0, 15).map((item) => (
                  <tr key={item.id}>
                    <td>#{item.purchase_orders?.po_number ?? '—'}</td>
                    <td>{item.products?.name ?? 'Unknown'} <span className="small muted">{item.products?.sku}</span></td>
                    <td style={{ textAlign: 'right' }}>{item.quantity_ordered}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantity_received}</td>
                    <td style={{ textAlign: 'right' }}>{Math.max(item.quantity_ordered - item.quantity_received, 0)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
