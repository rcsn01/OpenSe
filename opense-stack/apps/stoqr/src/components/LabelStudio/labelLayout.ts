export type LabelLayoutTextAlign = 'left' | 'center' | 'right'

const mmToPt = (value: number) => value * 2.83465

export const MIN_LABEL_SIZE_MM = 20
export const MIN_LABEL_FONT_SIZE_PT = 8
export const MIN_LABEL_CONTENT_PADDING_PT = 8
export const QR_SCALE_MIN = 50
export const QR_BASE_SIZE_PT = 44
export const BARCODE_SCALE_MIN = 50
export const BARCODE_SCALE_MAX = 160

export type LabelLayoutControls = {
  width: number
  height: number
  fontSize: number
  padding: number
  nameLines: number
  barcodeScale: number
  qrScale: number
  textAlign: LabelLayoutTextAlign
  showBorder: boolean
  showBarcode: boolean
  showQr: boolean
  showSku: boolean
  showLocation: boolean
  showName: boolean
  showPrice: boolean
}

export const defaultLabelLayout: LabelLayoutControls = {
  width: 100,
  height: 50,
  fontSize: 12,
  padding: 8,
  nameLines: 2,
  barcodeScale: 100,
  qrScale: 100,
  textAlign: 'left',
  showBorder: true,
  showBarcode: true,
  showQr: false,
  showSku: true,
  showLocation: false,
  showName: true,
  showPrice: false,
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const isTextAlign = (value: unknown): value is LabelLayoutTextAlign => value === 'left' || value === 'center' || value === 'right'

const getResolvedDimensionPt = (sizeMm: number) => Math.max(mmToPt(MIN_LABEL_SIZE_MM), mmToPt(sizeMm))

export const getLabelContentPaddingPt = (layout: Pick<LabelLayoutControls, 'padding'>) =>
  Math.max(MIN_LABEL_CONTENT_PADDING_PT, layout.padding)

export const getMaxQrSizePt = (layout: Pick<LabelLayoutControls, 'width' | 'height' | 'padding'>) => {
  const widthPt = getResolvedDimensionPt(layout.width)
  const heightPt = getResolvedDimensionPt(layout.height)
  const contentPadding = getLabelContentPaddingPt(layout)

  return Math.max(
    QR_BASE_SIZE_PT * (QR_SCALE_MIN / 100),
    Math.min(widthPt - contentPadding, heightPt - contentPadding),
  )
}

export const getMaxQrScale = (layout: Pick<LabelLayoutControls, 'width' | 'height' | 'padding'>) =>
  Math.max(QR_SCALE_MIN, Math.ceil((getMaxQrSizePt(layout) / QR_BASE_SIZE_PT) * 100))

export const getQrSizePt = (layout: Pick<LabelLayoutControls, 'width' | 'height' | 'padding' | 'qrScale' | 'showQr'>) =>
  layout.showQr
    ? Math.min(QR_BASE_SIZE_PT * (layout.qrScale / 100), getMaxQrSizePt(layout))
    : 0

export const resolveLabelLayout = (layout: Record<string, unknown> | null | undefined): LabelLayoutControls => {
  const nextLayout: LabelLayoutControls = { ...defaultLabelLayout }
  if (!layout || typeof layout !== 'object') return nextLayout

  if (typeof layout.width === 'number') nextLayout.width = clamp(layout.width, MIN_LABEL_SIZE_MM, 200)
  if (typeof layout.height === 'number') nextLayout.height = clamp(layout.height, MIN_LABEL_SIZE_MM, 200)
  if (typeof layout.fontSize === 'number') nextLayout.fontSize = clamp(layout.fontSize, MIN_LABEL_FONT_SIZE_PT, 48)
  if (typeof layout.padding === 'number') nextLayout.padding = clamp(layout.padding, 4, 24)
  if (typeof layout.nameLines === 'number') nextLayout.nameLines = clamp(Math.round(layout.nameLines), 1, 3)
  if (typeof layout.barcodeScale === 'number') nextLayout.barcodeScale = clamp(layout.barcodeScale, BARCODE_SCALE_MIN, BARCODE_SCALE_MAX)
  if (typeof layout.qrScale === 'number') nextLayout.qrScale = clamp(layout.qrScale, QR_SCALE_MIN, getMaxQrScale(nextLayout))
  if (isTextAlign(layout.textAlign)) nextLayout.textAlign = layout.textAlign
  if (typeof layout.showBorder === 'boolean') nextLayout.showBorder = layout.showBorder
  if (typeof layout.showBarcode === 'boolean') nextLayout.showBarcode = layout.showBarcode
  if (typeof layout.showQr === 'boolean') nextLayout.showQr = layout.showQr
  if (typeof layout.showSku === 'boolean') nextLayout.showSku = layout.showSku
  if (typeof layout.showLocation === 'boolean') nextLayout.showLocation = layout.showLocation
  if (typeof layout.showName === 'boolean') nextLayout.showName = layout.showName
  if (typeof layout.showPrice === 'boolean') nextLayout.showPrice = layout.showPrice

  return nextLayout
}

export const controlsToLayout = (controls: LabelLayoutControls): Record<string, unknown> => ({
  ...resolveLabelLayout(controls),
})

export const getEnabledLabelFields = (controls: LabelLayoutControls) =>
  [
    controls.showName ? 'Name' : null,
    controls.showSku ? 'SKU' : null,
    controls.showLocation ? 'Location' : null,
    controls.showPrice ? 'Price' : null,
    controls.showBarcode ? 'Barcode' : null,
    controls.showQr ? 'QR' : null,
  ].filter((value): value is string => Boolean(value))

export const getLabelLayoutSummary = (layout: Record<string, unknown> | LabelLayoutControls | null | undefined) => {
  const controls = resolveLabelLayout(layout)
  const enabledFields = getEnabledLabelFields(controls)

  return {
    size: `${controls.width}mm x ${controls.height}mm`,
    type: `${controls.fontSize}pt / ${controls.textAlign}`,
    fields: enabledFields.join(', ') || 'None',
  }
}

export const formatLabelPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return `$${value.toFixed(2)}`
}
