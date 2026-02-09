import { useMemo } from 'react'
import { EmptyState } from '../EmptyState'
import type { Product } from '../../types'

export const ReplenishmentTab = ({ products, isLoading }: { products: Product[]; isLoading: boolean }) => {
  const lowStock = useMemo(
    () => products.filter((p) => p.quantity_on_hand <= p.reorder_point),
    [products],
  )

  if (isLoading) return <div className="empty-state">Loading inventory...</div>

  return (
    <div className="grid" style={{ gridTemplateColumns: '1fr 320px', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Replenishment Recommendations</h3>
        {lowStock.length === 0 ? (
          <EmptyState title="Stock Healthy" description="No items are below their reorder point." />
        ) : (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th style={{ textAlign: 'right' }}>On Hand</th>
                  <th style={{ textAlign: 'right' }}>Reorder Point</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {lowStock.map((p) => (
                  <tr key={p.id}>
                    <td style={{ fontWeight: 500 }}>{p.name}</td>
                    <td className="muted small">{p.sku}</td>
                    <td style={{ textAlign: 'right' }}>{p.quantity_on_hand}</td>
                    <td style={{ textAlign: 'right' }}>{p.reorder_point}</td>
                    <td><span className="badge warning">Low Stock</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      <div className="card stack">
        <h3 className="section-title">Actions</h3>
        <p className="muted small">Generate a PO based on these recommendations.</p>
        <button className="button" disabled={lowStock.length === 0}>
          Create PO from Low Stock
        </button>
        <button className="button secondary" onClick={() => window.print()}>
          Print Pick List
        </button>
      </div>
    </div>
  )
}
