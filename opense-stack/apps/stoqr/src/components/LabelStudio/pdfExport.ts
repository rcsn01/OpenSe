import JsBarcode from 'jsbarcode'
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'
import QRCode from 'qrcode'

import type { LabelProduct } from '../../api/labelStudio'

type LabelLayoutControls = {
  width: number
  height: number
  fontSize: number
  showBarcode: boolean
  showQr: boolean
  showSku: boolean
  showName: boolean
}

const mmToPt = (value: number) => value * 2.83465

const A4_PAGE = {
  width: 595.28,
  height: 841.89,
}

const PAGE_MARGIN = 24
const CELL_GAP = 12
const LABEL_PADDING = 8

export const defaultLabelLayout: LabelLayoutControls = {
  width: 100,
  height: 50,
  fontSize: 12,
  showBarcode: true,
  showQr: false,
  showSku: true,
  showName: true,
}

export const resolveLabelLayout = (layout: Record<string, unknown> | null | undefined): LabelLayoutControls => {
  const nextLayout: LabelLayoutControls = { ...defaultLabelLayout }
  if (!layout || typeof layout !== 'object') return nextLayout

  if (typeof layout.width === 'number') nextLayout.width = layout.width
  if (typeof layout.height === 'number') nextLayout.height = layout.height
  if (typeof layout.fontSize === 'number') nextLayout.fontSize = layout.fontSize
  if (typeof layout.showBarcode === 'boolean') nextLayout.showBarcode = layout.showBarcode
  if (typeof layout.showQr === 'boolean') nextLayout.showQr = layout.showQr
  if (typeof layout.showSku === 'boolean') nextLayout.showSku = layout.showSku
  if (typeof layout.showName === 'boolean') nextLayout.showName = layout.showName

  return nextLayout
}

type LabelPageMetrics = {
  labelWidthPt: number
  labelHeightPt: number
  columns: number
  rows: number
  perPage: number
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

export type LabelExportPlacement = {
  x: number
  y: number
  page: number
  width: number
  height: number
  product: LabelProduct
}

export const buildLabelPlacements = (products: LabelProduct[], quantity: number, layout: LabelLayoutControls): LabelExportPlacement[] => {
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
    const y = A4_PAGE.height - PAGE_MARGIN - row * (metrics.labelHeightPt + CELL_GAP) - metrics.labelHeightPt

    return {
      x,
      y,
      page,
      width: metrics.labelWidthPt,
      height: metrics.labelHeightPt,
      product,
    }
  })
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

const dataUrlToBytes = (dataUrl: string) => {
  const base64Value = dataUrl.split(',')[1] ?? ''
  const binaryValue = atob(base64Value)
  return Uint8Array.from(binaryValue, (character) => character.charCodeAt(0))
}

export type LabelAssetRenderers = {
  renderQrDataUrl: (value: string, size: number) => Promise<string>
  renderBarcodeDataUrl: (value: string, width: number, height: number) => Promise<string>
}

const defaultAssetRenderers: LabelAssetRenderers = {
  renderQrDataUrl: (value, size) =>
    QRCode.toDataURL(value, {
      width: Math.max(64, Math.floor(size)),
      margin: 1,
      errorCorrectionLevel: 'M',
    }),
  renderBarcodeDataUrl: async (value, width, height) => {
    if (typeof document === 'undefined') {
      throw new Error('Barcode rendering requires a browser-like environment.')
    }

    const canvas = document.createElement('canvas')
    JsBarcode(canvas, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: Math.max(1, Math.floor(width / 80)),
      height: Math.max(24, Math.floor(height)),
    })

    return canvas.toDataURL('image/png')
  },
}

type LabelPdfExportOptions = {
  templateName: string
  layout: Record<string, unknown> | null | undefined
  products: LabelProduct[]
  quantity: number
  renderers?: LabelAssetRenderers
}

export const createLabelPdfDataUrl = async ({
  templateName,
  layout,
  products,
  quantity,
  renderers = defaultAssetRenderers,
}: LabelPdfExportOptions) => {
  const resolvedLayout = resolveLabelLayout(layout)
  const placements = buildLabelPlacements(products, quantity, resolvedLayout)

  if (placements.length === 0) {
    throw new Error('No labels available for export.')
  }

  const pdf = await PDFDocument.create()
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const qrCache = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>()
  const barcodeCache = new Map<string, Awaited<ReturnType<typeof pdf.embedPng>>>()
  const pages = new Map<number, ReturnType<typeof pdf.addPage>>()

  for (const placement of placements) {
    if (!pages.has(placement.page)) {
      const page = pdf.addPage([A4_PAGE.width, A4_PAGE.height])
      page.drawText(`Template: ${templateName}`, {
        x: PAGE_MARGIN,
        y: A4_PAGE.height - 16,
        size: 9,
        font,
        color: rgb(0.25, 0.25, 0.25),
      })
      pages.set(placement.page, page)
    }

    const page = pages.get(placement.page)
    if (!page) continue

    const productCode = placement.product.id
    const fontSize = Math.max(8, resolvedLayout.fontSize)
    const lineHeight = fontSize + 2
    const contentLeft = placement.x + LABEL_PADDING
    const contentWidth = placement.width - LABEL_PADDING * 2
    const barcodeHeight = resolvedLayout.showBarcode ? Math.min(34, placement.height * 0.28) : 0
    const qrSize = resolvedLayout.showQr ? Math.min(44, placement.height * 0.33, contentWidth * 0.3) : 0
    const textRightLimit = placement.x + placement.width - LABEL_PADDING - (qrSize > 0 ? qrSize + 6 : 0)
    const textMaxWidth = Math.max(40, textRightLimit - contentLeft)

    page.drawRectangle({
      x: placement.x,
      y: placement.y,
      width: placement.width,
      height: placement.height,
      borderWidth: 1,
      borderColor: rgb(0.7, 0.7, 0.7),
    })

    let cursorY = placement.y + placement.height - LABEL_PADDING - fontSize

    if (resolvedLayout.showName) {
      const maxChars = Math.max(8, Math.floor(textMaxWidth / (fontSize * 0.6)))
      const wrappedName = wrapText(placement.product.name, maxChars).slice(0, 2)
      wrappedName.forEach((line) => {
        page.drawText(line, {
          x: contentLeft,
          y: cursorY,
          size: fontSize,
          font,
        })
        cursorY -= lineHeight
      })
    }

    if (resolvedLayout.showSku) {
      page.drawText(`SKU: ${placement.product.sku}`, {
        x: contentLeft,
        y: cursorY,
        size: Math.max(8, fontSize - 1),
        font,
      })
      cursorY -= lineHeight
    }

    if (resolvedLayout.showQr && qrSize > 0) {
      let qrImage = qrCache.get(productCode)
      if (!qrImage) {
        const qrDataUrl = await renderers.renderQrDataUrl(productCode, qrSize)
        qrImage = await pdf.embedPng(dataUrlToBytes(qrDataUrl))
        qrCache.set(productCode, qrImage)
      }

      const qrX = placement.x + placement.width - LABEL_PADDING - qrSize
      const qrY = placement.y + placement.height - LABEL_PADDING - qrSize
      page.drawImage(qrImage, {
        x: qrX,
        y: qrY,
        width: qrSize,
        height: qrSize,
      })
    }

    if (resolvedLayout.showBarcode && barcodeHeight > 0) {
      const barcodeWidth = placement.width - LABEL_PADDING * 2
      let barcodeImage = barcodeCache.get(productCode)
      if (!barcodeImage) {
        const barcodeDataUrl = await renderers.renderBarcodeDataUrl(productCode, barcodeWidth, barcodeHeight)
        barcodeImage = await pdf.embedPng(dataUrlToBytes(barcodeDataUrl))
        barcodeCache.set(productCode, barcodeImage)
      }

      page.drawImage(barcodeImage, {
        x: contentLeft,
        y: placement.y + LABEL_PADDING,
        width: barcodeWidth,
        height: barcodeHeight,
      })
    }
  }

  const bytes = await pdf.save()
  let binary = ''
  bytes.forEach((byte) => {
    binary += String.fromCharCode(byte)
  })

  return `data:application/pdf;base64,${btoa(binary)}`
}
