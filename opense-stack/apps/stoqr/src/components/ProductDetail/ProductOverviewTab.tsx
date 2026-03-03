import { EmptyState } from '../EmptyState'
import { formatCurrency, formatDateTime } from '../../utils'
import type { InventoryTransaction, Product } from '../../types'

export const ProductOverviewTab = ({
  product,
  transactions,
  images,
  qrValue,
}: {
  product: Product
  transactions: InventoryTransaction[]
  images: string[]
  qrValue: string
}) => {
  const customFields = product.custom_fields ?? {}

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card stack">
          <div className="flex-between">
            <div>
              <h2 style={{ margin: 0 }}>{product.name}</h2>
              <div className="muted small">SKU {product.sku}</div>
            </div>
            <span className={`badge ${product.quantity_on_hand <= product.reorder_point ? 'warning' : 'success'}`}>
              {product.quantity_on_hand <= product.reorder_point ? 'Low stock' : 'In stock'}
            </span>
          </div>
          <p className="muted">{product.description ?? 'No description provided.'}</p>
          <div className="row wrap">
            <span className="pill">Quantity: {product.quantity_on_hand}</span>
            <span className="pill">Reorder at: {product.reorder_point}</span>
            <span className="pill">Cost: {formatCurrency(product.cost_price)}</span>
            <span className="pill">Selling: {formatCurrency(product.selling_price)}</span>
            {product.expiry_date && <span className="pill">Expiry: {product.expiry_date}</span>}
          </div>
          <div>
            <h3 className="section-title">Custom fields</h3>
            {Object.keys(customFields).length === 0 ? (
              <EmptyState title="No custom fields" description="Add values in product settings." />
            ) : (
              <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))' }}>
                {Object.entries(customFields).map(([key, value]) => (
                  <div key={key} className="card" style={{ boxShadow: 'none' }}>
                    <div className="muted small">{key}</div>
                    <div style={{ fontWeight: 600 }}>{String(value)}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        <div className="card stack">
          <h3 className="section-title">Item photos</h3>
          {images.length === 0 ? (
            <EmptyState title="No images" description="Upload images to the product." />
          ) : (
            <div className="image-grid">
              {images.map((url) => (
                <div className="image-card" key={url}>
                  <img src={url} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                </div>
              ))}
            </div>
          )}
          <div>
            <h3 className="section-title">Barcode / QR</h3>
            <div className="row" style={{ alignItems: 'flex-start' }}>
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=140x140&data=${encodeURIComponent(qrValue)}`}
                alt="QR Code"
                width={140}
                height={140}
                style={{ borderRadius: 12, border: '1px solid var(--border)' }}
              />
              <div className="stack">
                <div style={{ fontWeight: 600 }}>QR payload</div>
                <div className="muted small">{qrValue}</div>
                <button className="button ghost" type="button" onClick={() => navigator.clipboard.writeText(qrValue)}>
                  Copy
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="card">
        <h3 className="section-title">Activity history</h3>
        {transactions.length === 0 ? (
          <EmptyState title="No activity" description="Transactions for this product appear here." />
        ) : (
          <div className="timeline">
            {transactions.map((transaction) => (
              <div key={transaction.id} className="timeline-item">
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{transaction.transaction_type}</div>
                    <div className="small muted">{formatDateTime(transaction.created_at)}</div>
                  </div>
                  <span className="badge success">
                    {transaction.quantity_change > 0 ? '+' : ''}
                    {transaction.quantity_change}
                  </span>
                </div>
                <div className="small muted" style={{ marginTop: 8 }}>
                  {transaction.profiles?.full_name ?? transaction.profiles?.username ?? 'Unknown'}
                  {transaction.stock_after !== null ? ` · Stock after: ${transaction.stock_after}` : ''}
                </div>
                {transaction.notes && <div className="small">{transaction.notes}</div>}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
