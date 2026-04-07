export type LabelLayoutTextAlign = 'left' | 'center' | 'right'

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
  showName: true,
  showPrice: false,
}

const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value))

const isTextAlign = (value: unknown): value is LabelLayoutTextAlign => value === 'left' || value === 'center' || value === 'right'

export const resolveLabelLayout = (layout: Record<string, unknown> | null | undefined): LabelLayoutControls => {
  const nextLayout: LabelLayoutControls = { ...defaultLabelLayout }
  if (!layout || typeof layout !== 'object') return nextLayout

  if (typeof layout.width === 'number') nextLayout.width = clamp(layout.width, 20, 200)
  if (typeof layout.height === 'number') nextLayout.height = clamp(layout.height, 20, 200)
  if (typeof layout.fontSize === 'number') nextLayout.fontSize = clamp(layout.fontSize, 8, 48)
  if (typeof layout.padding === 'number') nextLayout.padding = clamp(layout.padding, 4, 24)
  if (typeof layout.nameLines === 'number') nextLayout.nameLines = clamp(Math.round(layout.nameLines), 1, 3)
  if (typeof layout.barcodeScale === 'number') nextLayout.barcodeScale = clamp(layout.barcodeScale, 50, 160)
  if (typeof layout.qrScale === 'number') nextLayout.qrScale = clamp(layout.qrScale, 50, 160)
  if (isTextAlign(layout.textAlign)) nextLayout.textAlign = layout.textAlign
  if (typeof layout.showBorder === 'boolean') nextLayout.showBorder = layout.showBorder
  if (typeof layout.showBarcode === 'boolean') nextLayout.showBarcode = layout.showBarcode
  if (typeof layout.showQr === 'boolean') nextLayout.showQr = layout.showQr
  if (typeof layout.showSku === 'boolean') nextLayout.showSku = layout.showSku
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
    controls.showPrice ? 'Price' : null,
    controls.showBarcode ? 'Barcode' : null,
    controls.showQr ? 'QR' : null,
  ].filter((value): value is string => Boolean(value))

export const formatLabelPrice = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) return null
  return `$${value.toFixed(2)}`
}