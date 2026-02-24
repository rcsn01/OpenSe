import { useMemo } from 'react'
import type { Product } from '../../types'

export const NotificationsTab = ({ products }: { products: Product[] }) => {
  const lowStock = useMemo(
    () => products.filter((product) => product.quantity_on_hand <= product.reorder_point),
    [products],
  )

  const reorderTriggers = useMemo(
    () => products.filter((product) => product.quantity_on_hand <= product.reorder_point && product.reorder_point > 0),
    [products],
  )

  const expiring = useMemo(() => {
    const now = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + 30)
    return products.filter((product) => {
      if (!product.expiry_date) return false
      const expiry = new Date(product.expiry_date)
      return expiry >= now && expiry <= cutoff
    })
  }, [products])

  return (
    <div className="stack">
      <div className="grid grid-3">
        <div className="card stat">
          <h3>Low Stock Notifications</h3>
          <div className="value">{lowStock.length}</div>
        </div>
        <div className="card stat">
          <h3>Reorder Point Triggers</h3>
          <div className="value">{reorderTriggers.length}</div>
        </div>
        <div className="card stat">
          <h3>Expiration Warnings</h3>
          <div className="value">{expiring.length}</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <h3 className="section-title">Low Stock / Reorder Alerts</h3>
          {lowStock.length === 0 ? (
            <div className="empty-state">No low stock products.</div>
          ) : (
            <div className="list">
              {lowStock.slice(0, 20).map((product) => (
                <div key={product.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="small muted">SKU {product.sku}</div>
                  </div>
                  <span className="badge warning">{product.quantity_on_hand} / RP {product.reorder_point}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card stack">
          <h3 className="section-title">Expiration Warnings</h3>
          {expiring.length === 0 ? (
            <div className="empty-state">No items expiring within 30 days.</div>
          ) : (
            <div className="list">
              {expiring.slice(0, 20).map((product) => (
                <div key={product.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="small muted">SKU {product.sku}</div>
                  </div>
                  <span className="badge danger">{product.expiry_date}</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
