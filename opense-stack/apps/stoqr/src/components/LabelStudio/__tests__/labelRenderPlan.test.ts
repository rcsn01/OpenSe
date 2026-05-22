import { describe, expect, it } from 'vitest'

import { defaultLabelLayout, getEnabledLabelFields, getMaxQrScale, resolveLabelLayout } from '../labelLayout'
import { buildLabelRenderPlan } from '../labelRenderPlan'

describe('label render plan', () => {
  it('keeps location disabled by default and out of enabled fields', () => {
    const layout = resolveLabelLayout(null)

    expect(layout.showLocation).toBe(false)
    expect(getEnabledLabelFields(layout)).not.toContain('Location')
    expect(getEnabledLabelFields({ ...layout, showLocation: true })).toEqual([
      'Name',
      'SKU',
      'Location',
      'Barcode',
    ])
  })

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

  it('renders location after SKU when enabled', () => {
    const plan = buildLabelRenderPlan(
      {
        id: 'product-1',
        name: 'Sample Product',
        sku: 'SKU-1',
        selling_price: 9.99,
        location_label: 'Warehouse / Aisle 1',
      },
      {
        ...defaultLabelLayout,
        showLocation: true,
        showPrice: true,
      },
    )

    expect(plan.textItems.map((item) => item.text)).toEqual([
      'Sample Product',
      'SKU: SKU-1',
      'Location: Warehouse / Aisle 1',
      'Price: $9.99',
    ])
  })

  it('omits location when disabled', () => {
    const plan = buildLabelRenderPlan(
      {
        id: 'product-1',
        name: 'Sample Product',
        sku: 'SKU-1',
        selling_price: 9.99,
        location_label: 'Warehouse / Aisle 1',
      },
      defaultLabelLayout,
    )

    expect(plan.textItems.map((item) => item.text)).not.toContain('Location: Warehouse / Aisle 1')
  })

  it('renders unassigned when location is enabled without a resolved folder path', () => {
    const plan = buildLabelRenderPlan(
      {
        id: 'product-1',
        name: 'Sample Product',
        sku: 'SKU-1',
        selling_price: 9.99,
        location_label: null,
      },
      {
        ...defaultLabelLayout,
        showLocation: true,
      },
    )

    expect(plan.textItems.map((item) => item.text)).toContain('Location: Unassigned')
  })
})
