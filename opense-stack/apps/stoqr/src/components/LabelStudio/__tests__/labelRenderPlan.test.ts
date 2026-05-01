import { describe, expect, it } from 'vitest'

import { defaultLabelLayout, getMaxQrScale, resolveLabelLayout } from '../labelLayout'
import { buildLabelRenderPlan } from '../labelRenderPlan'

describe('label render plan', () => {
  it('lets the max QR scale reach the bottom edge of the label without overflowing', () => {
    const layout = resolveLabelLayout({
      ...defaultLabelLayout,
      width: 100,
      height: 50,
      padding: 8,
      showQr: true,
      qrScale: getMaxQrScale({ width: 100, height: 50, padding: 8 }),
    })

    const plan = buildLabelRenderPlan(
      {
        id: 'product-1',
        name: 'Sample Product',
        sku: 'SKU-1',
        selling_price: 9.99,
      },
      layout,
    )

    const qrAsset = plan.assetItems.find((asset) => asset.kind === 'qr')

    expect(qrAsset).toBeDefined()
    expect(qrAsset?.x).toBeGreaterThanOrEqual(0)
    expect((qrAsset?.y ?? 0) + (qrAsset?.height ?? 0)).toBeCloseTo(plan.height, 5)
  })
})
