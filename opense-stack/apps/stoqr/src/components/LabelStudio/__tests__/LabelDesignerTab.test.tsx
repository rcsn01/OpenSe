import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabelDesignerTab } from '../LabelDesignerTab'
import { getMaxQrScale } from '../labelLayout'

const mockMutateAsync = vi.fn(async (_args?: unknown) => ({
  id: 'template-1',
  company_id: 'company-1',
  name: 'Product Label',
  is_system: false,
  layout: {
    width: 100,
    height: 50,
  },
  variable_fields: ['name', 'sku', 'price', 'barcode', 'qr'],
  created_at: '2026-02-20T00:00:00Z',
  updated_at: '2026-02-21T00:00:00Z',
}))

vi.mock('../../../hooks/queries/useLabelStudio', () => ({
  useLabelTemplates: () => ({
    data: [
      {
        id: 'template-1',
        company_id: 'company-1',
        name: 'Product Label',
        is_system: false,
        layout: {
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
        },
        variable_fields: ['name', 'sku', 'price', 'barcode', 'qr'],
        created_at: '2026-02-20T00:00:00Z',
        updated_at: null,
      },
    ],
    isLoading: false,
  }),
  useUpdateLabelTemplateLayout: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

describe('LabelDesignerTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves expanded layout controls and updates the live preview', async () => {
    render(<LabelDesignerTab companyId="company-1" selectedTemplateId="template-1" />)

    expect(screen.queryByText('Template Editor')).not.toBeInTheDocument()
    expect(screen.getByText('Live Canvas')).toBeInTheDocument()
    expect(screen.queryByText('Price: $299.00')).not.toBeInTheDocument()
    expect(screen.queryByText('Location: Warehouse / Aisle 1')).not.toBeInTheDocument()
    expect(screen.getByRole('switch', { name: /Location/i })).toBeInTheDocument()
    expect(screen.getByLabelText('QR Scale (%)')).toHaveAttribute(
      'max',
      String(getMaxQrScale({ width: 100, height: 50, padding: 8 })),
    )

    fireEvent.change(screen.getByLabelText('Content Padding (pt)'), { target: { value: '12' } })
    fireEvent.click(screen.getByRole('button', { name: 'Center aligned' }))
    fireEvent.change(screen.getByLabelText('Name Lines'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Barcode Scale (%)'), { target: { value: '130' } })
    fireEvent.change(screen.getByLabelText('QR Scale (%)'), { target: { value: '110' } })
    fireEvent.click(screen.getByRole('switch', { name: /Location/i }))
    fireEvent.click(screen.getByRole('switch', { name: /Price Field/i }))

    expect(screen.getByText('Location: Warehouse / Aisle 1')).toBeInTheDocument()
    expect(screen.getByText('Price: $299.00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Changes' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-1',
          variableFields: ['name', 'sku', 'price', 'barcode', 'qr', 'location'],
          layout: expect.objectContaining({
            padding: 12,
            nameLines: 3,
            barcodeScale: 130,
            qrScale: 110,
            textAlign: 'center',
            showLocation: true,
            showPrice: true,
          }),
        }),
      )
    })

    expect(screen.getByText('Design saved.')).toBeInTheDocument()
  })
})
