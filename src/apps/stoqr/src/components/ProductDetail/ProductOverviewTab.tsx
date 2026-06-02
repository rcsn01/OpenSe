import { useMemo } from 'react'
import type { InventoryTransaction, Product } from '../../types'
import { bindStyles } from '../../lib/bindStyles'
import { buildProductLocationScanPayload } from '../../lib/scanPayload'
import styles from './ProductDetailSurface.module.css'

const sx = bindStyles(styles)

const formatAttributeValue = (value: unknown) => {
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  if (value === null || value === undefined) return '—'

  const stringValue = String(value).trim()
  return stringValue.length > 0 ? stringValue : '—'
}

const toSentenceCase = (value: string) => value
  .replace(/_/g, ' ')
  .replace(/\b\w/g, (character) => character.toUpperCase())

const getStockStatus = (quantity: number, reorderPoint: number) => {
  if (quantity <= 0) return 'Out of stock'
  if (quantity <= reorderPoint) return 'Low stock'
  return 'In stock'
}

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
  const locationStocks = useMemo(
    () => [...(product.folder_stocks ?? [])].sort((a, b) => b.quantity_on_hand - a.quantity_on_hand),
    [product.folder_stocks],
  )
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
    <div className={sx('product-detail-overview')}>
      <div className={sx('product-detail-summary-columns')}>
        <div className={sx('product-detail-summary-column')}>
          <section className={sx('product-detail-media-section')} aria-label="Product photo">
            {primaryImage ? (
              <img
                src={primaryImage}
                alt={product.name}
                className={sx('product-detail-hero-image')}
              />
            ) : (
              <div className={sx('product-detail-image-placeholder')}>No product image uploaded</div>
            )}

            {images.length > 1 ? (
              <div className={sx('product-detail-thumb-row')} aria-label="Additional product photos">
                {images.slice(0, 4).map((imageUrl) => (
                  <img
                    key={imageUrl}
                    src={imageUrl}
                    alt={product.name}
                    className={sx('product-detail-thumb')}
                  />
                ))}
              </div>
            ) : null}
          </section>

        </div>

        <div className={sx('product-detail-summary-column')}>
          <section className={sx('product-detail-section', 'product-detail-section--flush', 'product-detail-description-section')}>
            <p className={sx('product-detail-kicker')}>Description</p>
            <p className={sx('product-detail-copy')}>
              {product.description?.trim() || 'No description has been added for this product yet.'}
            </p>
          </section>

          <section className={sx('product-detail-section', 'product-detail-inventory-section')}>
            <p className={sx('product-detail-kicker')}>Inventory</p>
            <div className={sx('product-detail-inventory-grid')}>
              <div className={sx('product-detail-stat-block')}>
                <span className={sx('product-detail-stat-label')}>Current Stock</span>
                <strong className={sx('product-detail-stat-value')}>{product.quantity_on_hand}</strong>
              </div>
              <div className={sx('product-detail-stat-block')}>
                <span className={sx('product-detail-stat-label')}>Low Stock Alert Level</span>
                <strong className={sx('product-detail-stat-value')}>{product.reorder_point}</strong>
                <span className={sx('product-detail-stat-note')}>Units</span>
              </div>
            </div>
          </section>

          <section className={sx('product-detail-section', 'product-detail-identity-section')}>
            <p className={sx('product-detail-kicker')}>Tag &amp; Identity</p>
            <div className={sx('product-detail-qr-card')}>
              <div className={sx('product-detail-qr-frame')}>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=176x176&data=${encodeURIComponent(qrValue)}`}
                  alt="Product identity QR code"
                  width={176}
                  height={176}
                  className={sx('product-detail-qr-image')}
                />
              </div>
            </div>
          </section>
        </div>
      </div>

      <div className={sx('product-detail-main')}>
        <section className={sx('product-detail-section', 'product-detail-attributes-section')}>
          <p className={sx('product-detail-kicker')}>Attributes</p>
          {attributeEntries.length > 0 ? (
            <div className={sx('product-detail-attributes-grid')}>
              {attributeEntries.map(([key, value]) => (
                <div key={key} className={sx('product-detail-attribute-cell')}>
                  <span className={sx('product-detail-attribute-label')}>{toSentenceCase(key)}</span>
                  <span className={sx('product-detail-attribute-value')}>{formatAttributeValue(value)}</span>
                </div>
              ))}
            </div>
          ) : (
            <p className={sx('product-detail-empty-copy')}>No custom attributes have been added yet.</p>
          )}
        </section>

        <section className={sx('product-detail-section', 'product-detail-section--wide')}>
          <div className={sx('product-detail-section-heading')}>
            <div>
              <p className={sx('product-detail-kicker')}>Stock by location</p>
              <p className={sx('product-detail-section-summary')}>
                {locationStocks.length > 0
                  ? `${product.quantity_on_hand} units across ${locationStocks.length} ${locationStocks.length === 1 ? 'location' : 'locations'}`
                  : 'No location stock has been recorded for this product.'}
              </p>
            </div>
          </div>

          {locationStocks.length > 0 ? (
            <div className={sx('product-location-stock-list')}>
              {locationStocks.map((stock) => {
                const reorderPoint = stock.reorder_point || product.reorder_point || 0
                const status = getStockStatus(stock.quantity_on_hand, reorderPoint)
                const locationQrValue = buildProductLocationScanPayload(product.id, stock.folder_id)
                return (
                  <div key={stock.folder_id} className={sx('product-location-stock-row')}>
                    <div className={sx('product-location-stock-qr-frame')}>
                      <img
                        src={`https://api.qrserver.com/v1/create-qr-code/?size=96x96&data=${encodeURIComponent(locationQrValue)}`}
                        alt={`QR code for ${stock.folder_name ?? stock.folder_id}`}
                        width={48}
                        height={48}
                        className={sx('product-location-stock-qr-image')}
                      />
                    </div>
                    <div className={sx('product-location-stock-location')}>
                      <span className={sx('product-location-stock-name')}>{stock.folder_name ?? stock.folder_id}</span>
                      <span className={sx('product-location-stock-path')}>Location</span>
                    </div>
                    <div className={sx('product-location-stock-metric')}>
                      <span className={sx('product-location-stock-label')}>On hand</span>
                      <strong>{stock.quantity_on_hand}</strong>
                    </div>
                    <div className={sx('product-location-stock-metric')}>
                      <span className={sx('product-location-stock-label')}>Reorder point</span>
                      <strong>{reorderPoint}</strong>
                    </div>
                    <span className={sx(
                      'product-location-stock-status',
                      status === 'Low stock' && 'product-location-stock-status--warning',
                      status === 'Out of stock' && 'product-location-stock-status--danger',
                    )}>
                      {status}
                    </span>
                  </div>
                )
              })}
            </div>
          ) : null}
        </section>

      </div>
    </div>
  )
}
