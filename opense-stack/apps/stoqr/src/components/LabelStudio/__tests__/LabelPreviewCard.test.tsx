import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'

import { LabelPreviewCard } from '../LabelPreviewCard'

describe('LabelPreviewCard', () => {
  it('renders the empty state when no template is selected', () => {
    render(
      <LabelPreviewCard
        title="Live Preview"
        emptyMessage="Select a template to preview"
      />,
    )

    expect(screen.getByText('Select a template to preview')).toBeInTheDocument()
  })

  it('renders template details using the shared layout controls', () => {
    render(
      <LabelPreviewCard
        title="Live Preview"
        description="Shared preview surface"
        templateName="Shipping Label"
        layout={{
          showPrice: true,
          showQr: true,
          textAlign: 'center',
          nameLines: 1,
          barcodeScale: 120,
          qrScale: 110,
        }}
        quantity={6}
        badgeText="Batch of 6"
        emptyMessage="Select a template to preview"
        sampleProduct={{
          name: 'Colombian Coffee Beans',
          sku: 'COF-42',
          selling_price: 19.5,
        }}
        summaryItems={[
          { label: 'Copies', value: '6 per item' },
          { label: 'Fields', value: 'Name, SKU, Price, Barcode, QR' },
        ]}
        variableFields={['name', 'sku', 'price', 'barcode', 'qr']}
      />,
    )

    expect(screen.getByText('Shipping Label')).toBeInTheDocument()
    expect(screen.getByText('Batch of 6')).toBeInTheDocument()
    expect(screen.getByText('Colombian Coffee Beans')).toBeInTheDocument()
    expect(screen.getByText('Price: $19.50')).toBeInTheDocument()
    expect(screen.getByLabelText('QR preview')).toBeInTheDocument()
    expect(screen.getByText('6 per item')).toBeInTheDocument()
    expect(screen.getByText('Barcode')).toBeInTheDocument()
  })
})