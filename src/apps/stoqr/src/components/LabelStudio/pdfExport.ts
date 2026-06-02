import { PDFDocument, StandardFonts, rgb } from 'pdf-lib'

import type { LabelProduct } from '../../api/labelStudio'
import { defaultLabelAssetRenderers, type LabelAssetRenderers } from './labelAssetRenderers'
import {
  A4_PAGE,
  PAGE_MARGIN,
  buildLabelPlacements,
  buildLabelRenderPlan,
  resolveLabelLayout,
  type LabelTextRenderItem,
} from './labelRenderPlan'

export { buildLabelPlacements, defaultLabelLayout } from './labelRenderPlan'
export { resolveLabelLayout } from './labelLayout'

const getAlignedTextX = (
  textItem: Pick<LabelTextRenderItem, 'text' | 'fontSize' | 'x' | 'width' | 'textAlign'>,
  font: Awaited<ReturnType<PDFDocument['embedFont']>>,
) => {
  if (textItem.textAlign === 'left') return textItem.x

  const textWidth = font.widthOfTextAtSize(textItem.text, textItem.fontSize)
  const remainingWidth = Math.max(0, textItem.width - Math.min(textWidth, textItem.width))

  if (textItem.textAlign === 'center') {
    return textItem.x + remainingWidth / 2
  }

  return textItem.x + remainingWidth
}

const dataUrlToBytes = (dataUrl: string) => {
  const base64Value = dataUrl.split(',')[1] ?? ''
  const binaryValue = atob(base64Value)
  return Uint8Array.from(binaryValue, (character) => character.charCodeAt(0))
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
  renderers = defaultLabelAssetRenderers,
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

    const renderPlan = buildLabelRenderPlan(placement.product, resolvedLayout)

    if (renderPlan.borderWidth > 0) {
      page.drawRectangle({
        x: placement.x,
        y: placement.y,
        width: placement.width,
        height: placement.height,
        borderWidth: renderPlan.borderWidth,
        borderColor: rgb(0.7, 0.7, 0.7),
      })
    }

    renderPlan.textItems.forEach((textItem) => {
      page.drawText(textItem.text, {
        x: placement.x + getAlignedTextX(textItem, font),
        y: placement.y + placement.height - textItem.baselineY,
        size: textItem.fontSize,
        font,
      })
    })

    for (const assetItem of renderPlan.assetItems) {
      if (assetItem.kind === 'qr') {
        let qrImage = qrCache.get(assetItem.key)
        if (!qrImage) {
          const qrDataUrl = await renderers.renderQrDataUrl(assetItem.value, assetItem.width)
          qrImage = await pdf.embedPng(dataUrlToBytes(qrDataUrl))
          qrCache.set(assetItem.key, qrImage)
        }

        page.drawImage(qrImage, {
          x: placement.x + assetItem.x,
          y: placement.y + placement.height - assetItem.y - assetItem.height,
          width: assetItem.width,
          height: assetItem.height,
        })
        continue
      }

      let barcodeImage = barcodeCache.get(assetItem.key)
      if (!barcodeImage) {
        const barcodeDataUrl = await renderers.renderBarcodeDataUrl(assetItem.value, assetItem.width, assetItem.height)
        barcodeImage = await pdf.embedPng(dataUrlToBytes(barcodeDataUrl))
        barcodeCache.set(assetItem.key, barcodeImage)
      }

      page.drawImage(barcodeImage, {
        x: placement.x + assetItem.x,
        y: placement.y + placement.height - assetItem.y - assetItem.height,
        width: assetItem.width,
        height: assetItem.height,
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
