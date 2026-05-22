import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { buildProductLocationScanPayload } from '../../../lib/scanPayload'
import type { Product } from '../../../types'
import { ProductOverviewTab } from '../ProductOverviewTab'

const product: Product = {
  id: 'prod-1',
  name: 'Packing Tape',
  sku: 'PK-300',
  description: null,
  quantity_on_hand: 48,
  reorder_point: 5,
  cost_price: null,
  selling_price: null,
  folder_id: 'folder-2',
  image_urls: [],
  custom_fields: {},
  expiry_date: null,
  folder_stocks: [
    {
      id: 'stock-1',
      product_id: 'prod-1',
      folder_id: 'folder-2',
      folder_name: 'Aisle 1',
      quantity_on_hand: 42,
      min_stock_level: 0,
      reorder_point: 5,
      max_stock_level: null,
    },
    {
      id: 'stock-2',
      product_id: 'prod-1',
      folder_id: 'folder-4',
      folder_name: 'Overflow',
      quantity_on_hand: 6,
      min_stock_level: 0,
      reorder_point: 5,
      max_stock_level: null,
    },
  ],
}

describe('ProductOverviewTab', () => {
  it('renders a product-location QR code for each stock location row', () => {
    render(
      <ProductOverviewTab
        product={product}
        transactions={[]}
        images={[]}
        qrValue={product.id}
      />,
    )

    const locationQrImages = screen.getAllByRole('img', { name: /QR code for/ })

    expect(locationQrImages).toHaveLength(2)
    expect(locationQrImages[0]).toHaveAttribute(
      'src',
      expect.stringContaining(encodeURIComponent(buildProductLocationScanPayload('prod-1', 'folder-2'))),
    )
    expect(locationQrImages[1]).toHaveAttribute(
      'src',
      expect.stringContaining(encodeURIComponent(buildProductLocationScanPayload('prod-1', 'folder-4'))),
    )
  })
})
