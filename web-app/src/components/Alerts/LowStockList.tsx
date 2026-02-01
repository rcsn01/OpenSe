import { EmptyState } from '../EmptyState'
import type { Product } from '../../types'

export const LowStockList = ({ products }: { products: Product[] }) => {
  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <h3 className="section-title">Low stock</h3>
        <span className="pill">{products.length} items</span>
      </div>
      {products.length === 0 ? (
        <EmptyState title="All clear" description="No items need reorder." />
      ) : (
        <div className="list">
          {products.map((product) => (
            <div key={product.id} className="flex-between">
              <div>
                <div style={{ fontWeight: 600 }}>{product.name}</div>
                <div className="small muted">SKU {product.sku}</div>
              </div>
              <span className="badge warning">{product.quantity_on_hand} left</span>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
