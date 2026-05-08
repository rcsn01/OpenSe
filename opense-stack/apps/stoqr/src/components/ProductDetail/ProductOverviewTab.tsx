import { useMemo } from 'react'
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

export const ProductOverviewTab = ({
  product,
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
    () => Object.entries(customFields).filter(([key, value]) => {
      if (value === null || value === undefined) return false
      if (typeof value === 'string' && value.trim().length === 0) return false
      if (key.toLowerCase() === 'supplier') return false
      return true
    }),
    [customFields],
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

        <section className="product-detail-section product-detail-section--flush">
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
              <div className="product-detail-stat-line">
                <strong className="product-detail-stat-value">{product.quantity_on_hand}</strong>
                <button type="button" className="product-detail-inline-link">Adjust</button>
              </div>
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
                  <span className="product-detail-attribute-label">{toSentenceCase(key)}</span>
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
        <section className="product-detail-aside-section product-detail-aside-section--identity">
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
          </div>
        </section>
      </aside>
    </div>
  )
}
