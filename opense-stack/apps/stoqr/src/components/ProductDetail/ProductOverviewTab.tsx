import { useMemo } from 'react'
import { formatDateTime } from '../../utils'
import type { InventoryTransaction, Product } from '../../types'

const formatAttributeValue = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined) return '—'

  const stringValue = String(value).trim()
  return stringValue.length > 0 ? stringValue : '—'
}

const toSentenceCase = (value: string) => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase())

const describeTransaction = (transaction: InventoryTransaction) => {
  if (transaction.stock_after !== null && transaction.quantity_change !== 0) {
    const previousStock = transaction.stock_after - transaction.quantity_change
    return `Stock adjusted from ${previousStock} to ${transaction.stock_after} (${toSentenceCase(transaction.transaction_type)})`
  }

  if (transaction.notes?.trim()) {
    return transaction.notes.trim()
  }

  return toSentenceCase(transaction.transaction_type)
}

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
  const primaryImage = images[0] ?? null
  const attributeEntries = useMemo(
    () => Object.entries(customFields).filter(([, value]) => {
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim().length === 0) return false
      return true
    }),
    [customFields],
  )
  const recentTransactions = useMemo(
    () => transactions.slice(0, 5).map((transaction) => ({
      id: transaction.id,
      summary: describeTransaction(transaction),
      actor: transaction.profiles?.full_name ?? transaction.profiles?.username ?? 'System',
      occurredAt: formatDateTime(transaction.created_at),
    })),
    [transactions],
  )

  return (
    <div className="product-detail-overview">
      <div className="product-detail-main">
        <section className="product-detail-media-section" aria-label="Product photo">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={product.name}
              className="product-detail-hero-image"
            />
          ) : (
            <div className="product-detail-image-placeholder">No product image uploaded</div>
          )}

          {images.length > 1 ? (
            <div className="product-detail-thumb-row" aria-label="Additional product photos">
              {images.slice(0, 4).map((imageUrl) => (
                <img
                  key={imageUrl}
                  src={imageUrl}
                  alt={product.name}
                  className="product-detail-thumb"
                />
              ))}
            </div>
          ) : null}
        </section>

        <section className="product-detail-section">
          <p className="product-detail-kicker">Description</p>
          <p className="product-detail-copy">
            {product.description?.trim() || 'No description has been added for this product yet.'}
          </p>
        </section>

        <section className="product-detail-section">
          <p className="product-detail-kicker">Inventory</p>
          <div className="product-detail-inventory-grid">
            <div className="product-detail-stat-block">
              <span className="product-detail-stat-label">Current Stock</span>
              <strong className="product-detail-stat-value">{product.quantity_on_hand}</strong>
              <span className="product-detail-stat-note">Units available</span>
            </div>
            <div className="product-detail-stat-block">
              <span className="product-detail-stat-label">Low Stock Alert Level</span>
              <strong className="product-detail-stat-value">{product.reorder_point}</strong>
              <span className="product-detail-stat-note">Units</span>
            </div>
          </div>
        </section>

        <section className="product-detail-section">
          <p className="product-detail-kicker">Attributes</p>
          {attributeEntries.length > 0 ? (
            <div className="product-detail-attributes-grid">
              {attributeEntries.map(([key, value]) => (
                <div key={key} className="product-detail-attribute-cell">
                  <span className="product-detail-attribute-label">{key}</span>
                  <span className="product-detail-attribute-value">{formatAttributeValue(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className="product-detail-empty-copy">No custom attributes have been added yet.</p>
          )}
        </section>
      </div>

      <aside className="product-detail-sidebar">
        <section className="product-detail-aside-section">
          <p className="product-detail-kicker">Tag &amp; Identity</p>
          <div className="product-detail-qr-card">
            <div className="product-detail-qr-frame">
              <img
                src={`https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${encodeURIComponent(qrValue)}`}
                alt="Product identity QR code"
                width={176}
                height={176}
                className="product-detail-qr-image"
              />
            </div>
            <p className="product-detail-sidebar-copy">Scan to view in warehouse system</p>
          </div>
        </section>

        <section className="product-detail-aside-section">
          <p className="product-detail-kicker">Recent Activity</p>
          {recentTransactions.length > 0 ? (
            <div className="product-detail-timeline">
              {recentTransactions.map((transaction) => (
                <div key={transaction.id} className="product-detail-timeline-item">
                  <span className="product-detail-timeline-dot" aria-hidden="true" />
                  <p className="product-detail-timeline-title">{transaction.summary}</p>
                  <p className="product-detail-timeline-meta">{transaction.actor} &bull; {transaction.occurredAt}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="product-detail-sidebar-copy">No recent activity recorded for this product.</p>
          )}
        </section>
      </aside>
    </div>
  )
}
