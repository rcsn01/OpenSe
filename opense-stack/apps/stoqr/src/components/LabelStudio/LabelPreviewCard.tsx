import type { CSSProperties } from 'react'

import type { LabelProduct } from '../../api/labelStudio'
import { formatLabelPrice, resolveLabelLayout } from './labelLayout'

type LabelPreviewSummaryItem = {
  label: string
  value: string
}

type LabelPreviewCardProps = {
  title: string
  description?: string
  templateName?: string | null
  layout?: Record<string, unknown> | null
  variableFields?: string[]
  quantity?: number
  badgeText?: string
  emptyMessage: string
  sampleProduct?: Partial<Pick<LabelProduct, 'id' | 'name' | 'sku' | 'selling_price'>> | null
  summaryItems?: LabelPreviewSummaryItem[]
}

const barcodeBarPattern = [2, 1, 1, 3, 2, 1, 2, 1, 3, 2, 1, 1, 2, 3, 1, 2, 2, 1, 3, 1]

const qrCells = [
  1, 1, 1, 0, 1,
  1, 0, 1, 0, 0,
  1, 1, 1, 0, 1,
  0, 0, 1, 0, 1,
  1, 0, 1, 1, 1,
]

const defaultSample = {
  id: 'sample-id',
  name: 'Sample Product Name',
  sku: 'SKU-001',
  selling_price: 24,
}

const formatFieldName = (value: string) => {
  const normalizedValue = value.trim().toLowerCase()

  if (normalizedValue === 'sku') return 'SKU'
  if (normalizedValue === 'qr') return 'QR'

  return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1)
}

export const LabelPreviewCard = ({
  title,
  description,
  templateName,
  layout,
  variableFields,
  quantity,
  badgeText,
  emptyMessage,
  sampleProduct,
  summaryItems,
}: LabelPreviewCardProps) => {
  const resolvedLayout = resolveLabelLayout(layout)
  const previewProduct = {
    ...defaultSample,
    ...(sampleProduct ?? {}),
  }
  const priceText = formatLabelPrice(previewProduct.selling_price)
  const alignmentClass = `is-${resolvedLayout.textAlign}`
  const surfaceStyle: CSSProperties = {
    aspectRatio: `${resolvedLayout.width} / ${resolvedLayout.height}`,
    padding: `${resolvedLayout.padding}px`,
    borderWidth: resolvedLayout.showBorder ? '1px' : '0',
  }
  const copyStyle: CSSProperties = {
    textAlign: resolvedLayout.textAlign,
  }
  const nameStyle: CSSProperties = {
    WebkitBoxOrient: 'vertical',
    WebkitLineClamp: resolvedLayout.nameLines,
  }
  const qrSize = Math.round(Math.max(54, Math.min(88, 60 * (resolvedLayout.qrScale / 100))))
  const barcodeHeight = Math.round(Math.max(18, Math.min(42, 28 * (resolvedLayout.barcodeScale / 100))))

  return (
    <div className="card export-preview-card label-preview-card">
      <div className="label-preview-card-header">
        <div>
          <h3 className="section-title" style={{ marginBottom: description ? 4 : 0 }}>{title}</h3>
          {description ? <p className="small muted" style={{ margin: 0 }}>{description}</p> : null}
        </div>
        {badgeText ? <span className="badge neutral">{badgeText}</span> : null}
      </div>

      <div className="label-preview-canvas">
        {templateName ? (
          <div className="label-preview-surface" style={surfaceStyle}>
            <div className="label-preview-topline">
              <span className="label-preview-tag">Template</span>
              {quantity && quantity > 0 ? <span className="label-preview-qty">x{quantity}</span> : null}
            </div>

            <span className="label-preview-template-name" title={templateName}>{templateName}</span>

            <div className={`label-preview-body ${alignmentClass}`}>
              <div className="label-preview-copy" style={copyStyle}>
                {resolvedLayout.showName ? <span className="label-preview-primary" style={nameStyle}>{previewProduct.name}</span> : null}
                {resolvedLayout.showSku ? <span className="label-preview-secondary">SKU: {previewProduct.sku}</span> : null}
                {resolvedLayout.showPrice && priceText ? <span className="label-preview-secondary">Price: {priceText}</span> : null}
              </div>

              {resolvedLayout.showQr ? (
                <div className="label-preview-qr" aria-label="QR preview" style={{ width: qrSize, height: qrSize }}>
                  {qrCells.map((cell, index) => (
                    <span
                      key={`qr-${index}`}
                      className={`label-preview-qr-cell${cell ? ' is-active' : ''}`}
                    />
                  ))}
                </div>
              ) : null}
            </div>

            {resolvedLayout.showBarcode ? (
              <div className="label-preview-barcode" aria-label="Barcode preview" style={{ height: barcodeHeight }}>
                {barcodeBarPattern.map((barWidth, index) => (
                  <span
                    key={`bar-${index}`}
                    className="label-preview-bar"
                    style={{ width: `${barWidth}px` }}
                  />
                ))}
              </div>
            ) : null}
          </div>
        ) : (
          <div className="empty-state" style={{ padding: 24 }}>{emptyMessage}</div>
        )}
      </div>

      {summaryItems?.length ? (
        <div className="label-preview-meta-grid">
          {summaryItems.map((item) => (
            <div key={`${item.label}-${item.value}`} className="label-preview-meta">
              <span className="label-preview-meta-label">{item.label}</span>
              <span className="label-preview-meta-value">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {variableFields?.length ? (
        <div className="label-preview-variables">
          {variableFields.map((field) => (
            <span key={field} className="label-preview-variable-pill">{formatFieldName(field)}</span>
          ))}
        </div>
      ) : null}
    </div>
  )
}