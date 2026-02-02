import { EmptyState } from '../EmptyState'
import type { Product } from '../../types'

export const ExpiryList = ({ products }: { products: Product[] }) => {
  return (
    <div className="card">
      <div className="flex-between" style={{ marginBottom: 12 }}>
        <h3 className="section-title">Expiry alerts</h3>
        <span className="pill">{products.length} items</span>
      </div>
      {products.length === 0 ? (
        <EmptyState title="No expirations" description="No items expiring in the next 30 days." />
      ) : (
        <div className="list">
          {products.map((product) => (
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
  )
}
