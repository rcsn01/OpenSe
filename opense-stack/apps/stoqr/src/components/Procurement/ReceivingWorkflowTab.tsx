import { useMemo, useState } from 'react'
import {
  useProcurementPurchaseOrderItems,
  useRecordPurchaseOrderReceipt,
} from '../../hooks/queries/useProcurementTabs'

export const ReceivingWorkflowTab = ({ companyId }: { companyId: string }) => {
  const { data: items = [], isLoading } = useProcurementPurchaseOrderItems(companyId)
  const recordReceiptMutation = useRecordPurchaseOrderReceipt(companyId)

  const [selectedItemId, setSelectedItemId] = useState('')
  const [quantity, setQuantity] = useState(1)
  const [notes, setNotes] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const receivableItems = useMemo(
    () => items.filter((item) => item.quantity_received < item.quantity_ordered),
    [items],
  )

  const selectedItem = receivableItems.find((item) => item.id === selectedItemId) ?? null
  const remaining = selectedItem ? Math.max(selectedItem.quantity_ordered - selectedItem.quantity_received, 0) : 0

  const recordReceipt = async () => {
    if (!selectedItem) return

    try {
      setMessage(null)
      await recordReceiptMutation.mutateAsync({
        poId: selectedItem.po_id,
        productId: selectedItem.product_id ?? '',
        quantityReceived: quantity,
        notes,
      })
      setNotes('')
      setQuantity(1)
      setMessage('Receipt recorded. Order progress and stock have been updated.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to record receipt.')
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Receiving Workflow</h3>
        {isLoading ? (
          <div className="empty-state">Loading receivable items...</div>
        ) : receivableItems.length === 0 ? (
          <div className="empty-state">No items pending receipt.</div>
        ) : (
          <>
            <label className="stack">
              PO Item
              <select className="select" value={selectedItemId} onChange={(event) => setSelectedItemId(event.target.value)}>
                <option value="">Select item...</option>
                {receivableItems.map((item) => (
                  <option key={item.id} value={item.id}>
                    #{item.purchase_orders?.po_number ?? '—'} · {item.products?.name ?? 'Unknown'}
                  </option>
                ))}
              </select>
            </label>
            <label className="stack">
              Quantity to Receive
              <input
                className="input"
                type="number"
                min={1}
                max={Math.max(remaining, 1)}
                value={quantity}
                onChange={(event) => setQuantity(Number(event.target.value) || 1)}
              />
            </label>
            <label className="stack">
              Notes
              <input className="input" value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional receiving note" />
            </label>
            <div className="small muted">Remaining for selected line item: {remaining}</div>
            <button className="button" onClick={recordReceipt} disabled={!selectedItem || recordReceiptMutation.isPending}>Record Receipt</button>
            {message && <div className="small muted">{message}</div>}
          </>
        )}
      </div>

      <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Partial Receipts Queue</h3>
          <div className="small muted">Items with remaining quantities are listed below.</div>
        </div>
        {receivableItems.length === 0 ? (
          <div className="empty-state">All purchase order lines are fully received.</div>
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>PO #</th>
                  <th>Item</th>
                  <th style={{ textAlign: 'right' }}>Ordered</th>
                  <th style={{ textAlign: 'right' }}>Received</th>
                  <th style={{ textAlign: 'right' }}>Remaining</th>
                </tr>
              </thead>
              <tbody>
                {receivableItems.map((item) => (
                  <tr key={item.id}>
                    <td>#{item.purchase_orders?.po_number ?? '—'}</td>
                    <td>{item.products?.name ?? 'Unknown'} <span className="small muted">{item.products?.sku ?? '—'}</span></td>
                    <td style={{ textAlign: 'right' }}>{item.quantity_ordered}</td>
                    <td style={{ textAlign: 'right' }}>{item.quantity_received}</td>
                    <td style={{ textAlign: 'right', fontWeight: 700 }}>{Math.max(item.quantity_ordered - item.quantity_received, 0)}</td>
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
