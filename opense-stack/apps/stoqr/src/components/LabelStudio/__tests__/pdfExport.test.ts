import { describe, expect, it, vi } from 'vitest'

import {
  buildLabelPlacements,
  createLabelPdfDataUrl,
  defaultLabelLayout,
  resolveLabelLayout,
} from '../pdfExport'

const tinyPngDataUrl =
  'data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+Xx1sAAAAASUVORK5CYII='

describe('label studio pdf export', () => {
  it('resolves layout controls with defaults', () => {
    const layout = resolveLabelLayout({
      width: 80,
      showQr: true,
      showBarcode: false,
    })

    expect(layout.width).toBe(80)
    expect(layout.height).toBe(defaultLabelLayout.height)
    expect(layout.showQr).toBe(true)
    expect(layout.showBarcode).toBe(false)
    expect(layout.showName).toBe(true)
  })

  it('builds placements across pages without overlapping coordinates on same page', () => {
    const products = [
      { id: 'p-1', name: 'Product One', sku: 'SKU-1', folder_id: null },
      { id: 'p-2', name: 'Product Two', sku: 'SKU-2', folder_id: null },
    ]

    const placements = buildLabelPlacements(products, 8, {
      ...defaultLabelLayout,
      width: 100,
      height: 50,
    })

    expect(placements).toHaveLength(16)

    const samePageCoordinates = new Set<string>()
    placements
      .filter((placement) => placement.page === 0)
      .forEach((placement) => {
        const key = `${placement.page}:${placement.x}:${placement.y}`
        expect(samePageCoordinates.has(key)).toBe(false)
        samePageCoordinates.add(key)
      })
  })

  it('encodes product id for QR and CODE128 barcode assets', async () => {
    const renderQrDataUrl = vi.fn(async () => tinyPngDataUrl)
    const renderBarcodeDataUrl = vi.fn(async () => tinyPngDataUrl)

    const output = await createLabelPdfDataUrl({
      templateName: 'Product Label',
      layout: {
        showQr: true,
        showBarcode: true,
        showSku: false,
        showName: true,
      },
      products: [{ id: 'product-id-123', name: 'Orange Juice Bottle', sku: 'OJ-01', folder_id: null }],
      quantity: 1,
      renderers: {
        renderQrDataUrl,
        renderBarcodeDataUrl,
      },
    })

    expect(output.startsWith('data:application/pdf;base64,')).toBe(true)
    expect(renderQrDataUrl).toHaveBeenCalledWith('product-id-123', expect.any(Number))
    expect(renderBarcodeDataUrl).toHaveBeenCalledWith('product-id-123', expect.any(Number), expect.any(Number))
  })
})
