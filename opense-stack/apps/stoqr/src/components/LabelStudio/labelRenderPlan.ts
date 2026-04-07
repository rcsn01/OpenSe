import type { LabelProduct } from '../../api/labelStudio'
import {
  defaultLabelLayout,
  formatLabelPrice,
  resolveLabelLayout,
  type LabelLayoutControls,
  type LabelLayoutTextAlign,
} from './labelLayout'

const mmToPt = (value: number) => value * 2.83465

export const LABEL_FONT_STACK = 'Helvetica, Arial, sans-serif'

export const A4_PAGE = {
  width: 595.28,
  height: 841.89,
}

export const PAGE_MARGIN = 24

const CELL_GAP = 12
const LABEL_PADDING = 8
const QR_TEXT_GAP = 6

type LabelPageMetrics = {
  labelWidthPt: number
  labelHeightPt: number
  columns: number
  rows: number
  perPage: number
}

export type LabelTextRenderItem = {
  key: string
  text: string
  x: number
  width: number
  baselineY: number
  fontSize: number
  fontWeight: 'regular' | 'semibold'
  textAlign: LabelLayoutTextAlign
}

export type LabelAssetRenderItem = {
  key: string
  kind: 'qr' | 'barcode'
  value: string
  x: number
  y: number
  width: number
  height: number
}

export type LabelRenderPlan = {
  width: number
  height: number
  borderWidth: number
  textItems: LabelTextRenderItem[]
  assetItems: LabelAssetRenderItem[]
}

export type LabelExportPlacement = {
  x: number
  y: number
  top: number
  page: number
  width: number
  height: number
  product: LabelProduct
}

const getPageMetrics = (layout: LabelLayoutControls): LabelPageMetrics => {
  const labelWidthPt = Math.max(mmToPt(20), mmToPt(layout.width))
  const labelHeightPt = Math.max(mmToPt(20), mmToPt(layout.height))
  const printableWidth = A4_PAGE.width - PAGE_MARGIN * 2
  const printableHeight = A4_PAGE.height - PAGE_MARGIN * 2
  const columns = Math.max(1, Math.floor((printableWidth + CELL_GAP) / (labelWidthPt + CELL_GAP)))
  const rows = Math.max(1, Math.floor((printableHeight + CELL_GAP) / (labelHeightPt + CELL_GAP)))
  const perPage = columns * rows

  return {
    labelWidthPt,
    labelHeightPt,
    columns,
    rows,
    perPage,
  }
}

const wrapText = (value: string, maxCharactersPerLine: number) => {
  const words = value.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return []

  const lines: string[] = []
  let currentLine = words[0]

  for (let index = 1; index < words.length; index += 1) {
    const nextWord = words[index]
    const nextLine = `${currentLine} ${nextWord}`
    if (nextLine.length <= maxCharactersPerLine) {
      currentLine = nextLine
    } else {
      lines.push(currentLine)
      currentLine = nextWord
    }
  }

  lines.push(currentLine)
  return lines
}

export const buildLabelRenderPlan = (
  product: Pick<LabelProduct, 'id' | 'name' | 'sku' | 'selling_price'>,
  layoutInput: Record<string, unknown> | LabelLayoutControls | null | undefined,
): LabelRenderPlan => {
  const layout = resolveLabelLayout(layoutInput as Record<string, unknown> | null | undefined)
  const width = Math.max(mmToPt(20), mmToPt(layout.width))
  const height = Math.max(mmToPt(20), mmToPt(layout.height))
  const fontSize = Math.max(8, layout.fontSize)
  const secondaryFontSize = Math.max(8, fontSize - 1)
  const lineHeight = fontSize + 2
  const contentPadding = Math.max(LABEL_PADDING, layout.padding)
  const contentLeft = contentPadding
  const contentWidth = width - contentPadding * 2
  const qrSize = layout.showQr
    ? Math.min(44 * (layout.qrScale / 100), height * 0.4, contentWidth * 0.35)
    : 0
  const barcodeHeight = layout.showBarcode
    ? Math.min(34 * (layout.barcodeScale / 100), height * 0.35)
    : 0
  const textRightLimit = width - contentPadding - (qrSize > 0 ? qrSize + QR_TEXT_GAP : 0)
  const textMaxWidth = Math.max(40, textRightLimit - contentLeft)
  const textItems: LabelTextRenderItem[] = []
  const assetItems: LabelAssetRenderItem[] = []
  let cursorBaseline = contentPadding + fontSize

  const addTextItem = (
    key: string,
    text: string,
    size: number,
    fontWeight: LabelTextRenderItem['fontWeight'],
  ) => {
    textItems.push({
      key,
      text,
      x: contentLeft,
      width: textMaxWidth,
      baselineY: cursorBaseline,
      fontSize: size,
      fontWeight,
      textAlign: layout.textAlign,
    })
    cursorBaseline += lineHeight
  }

  if (layout.showName) {
    const maxChars = Math.max(8, Math.floor(textMaxWidth / (fontSize * 0.6)))
    const wrappedName = wrapText(product.name, maxChars).slice(0, layout.nameLines)

    wrappedName.forEach((line, index) => {
      addTextItem(`name-${index}`, line, fontSize, 'semibold')
    })
  }

  if (layout.showSku) {
    addTextItem('sku', `SKU: ${product.sku}`, secondaryFontSize, 'regular')
  }

  if (layout.showPrice) {
    const priceText = formatLabelPrice(product.selling_price)
    if (priceText) {
      addTextItem('price', `Price: ${priceText}`, secondaryFontSize, 'regular')
    }
  }

  if (layout.showQr && qrSize > 0) {
    assetItems.push({
      key: `qr:${product.id}:${Math.round(qrSize)}`,
      kind: 'qr',
      value: product.id,
      x: width - contentPadding - qrSize,
      y: contentPadding,
      width: qrSize,
      height: qrSize,
    })
  }

  if (layout.showBarcode && barcodeHeight > 0) {
    assetItems.push({
      key: `barcode:${product.id}:${Math.round(contentWidth)}x${Math.round(barcodeHeight)}`,
      kind: 'barcode',
      value: product.id,
      x: contentLeft,
      y: height - contentPadding - barcodeHeight,
      width: contentWidth,
      height: barcodeHeight,
    })
  }

  return {
    width,
    height,
    borderWidth: layout.showBorder ? 1 : 0,
    textItems,
    assetItems,
  }
}

export const buildLabelPlacements = (
  products: LabelProduct[],
  quantity: number,
  layoutInput: Record<string, unknown> | LabelLayoutControls | null | undefined,
): LabelExportPlacement[] => {
  const layout = resolveLabelLayout(layoutInput as Record<string, unknown> | null | undefined)
  const safeQuantity = Math.max(1, Math.floor(quantity))
  const source: LabelProduct[] = []

  products.forEach((product) => {
    for (let index = 0; index < safeQuantity; index += 1) {
      source.push(product)
    }
  })

  const metrics = getPageMetrics(layout)

  return source.map((product, index) => {
    const page = Math.floor(index / metrics.perPage)
    const indexOnPage = index % metrics.perPage
    const row = Math.floor(indexOnPage / metrics.columns)
    const column = indexOnPage % metrics.columns
    const x = PAGE_MARGIN + column * (metrics.labelWidthPt + CELL_GAP)
    const top = PAGE_MARGIN + row * (metrics.labelHeightPt + CELL_GAP)
    const y = A4_PAGE.height - top - metrics.labelHeightPt

    return {
      x,
      y,
      top,
      page,
      width: metrics.labelWidthPt,
      height: metrics.labelHeightPt,
      product,
    }
  })
}

export const getPlacementPageCount = (placements: LabelExportPlacement[]) =>
  placements.reduce((count, placement) => Math.max(count, placement.page + 1), 0)

export { defaultLabelLayout, resolveLabelLayout }