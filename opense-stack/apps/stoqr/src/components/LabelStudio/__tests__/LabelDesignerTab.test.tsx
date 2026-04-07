import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabelDesignerTab } from '../LabelDesignerTab'

const mockMutateAsync = vi.fn(async () => undefined)

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
    mutateAsync: (...args: unknown[]) => mockMutateAsync(...args),
    isPending: false,
  }),
}))

describe('LabelDesignerTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('saves expanded layout controls and updates the live preview', async () => {
    render(<LabelDesignerTab companyId="company-1" selectedTemplateId="template-1" />)

    expect(screen.getByText('Live Design Preview')).toBeInTheDocument()
    expect(screen.queryByText('Price: $24.00')).not.toBeInTheDocument()

    fireEvent.change(screen.getByLabelText('Content Padding (pt)'), { target: { value: '12' } })
    fireEvent.change(screen.getByLabelText('Text Alignment'), { target: { value: 'center' } })
    fireEvent.change(screen.getByLabelText('Name Lines'), { target: { value: '3' } })
    fireEvent.change(screen.getByLabelText('Barcode Scale (%)'), { target: { value: '130' } })
    fireEvent.change(screen.getByLabelText('QR Scale (%)'), { target: { value: '110' } })
    fireEvent.click(screen.getByRole('button', { name: /PriceSelling price line/i }))

    expect(screen.getByText('Price: $24.00')).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Save Design' }))

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-1',
          variableFields: ['name', 'sku', 'price', 'barcode', 'qr'],
          layout: expect.objectContaining({
            padding: 12,
            nameLines: 3,
            barcodeScale: 130,
            qrScale: 110,
            textAlign: 'center',
            showPrice: true,
          }),
        }),
      )
    })

    expect(screen.getByText('Design saved.')).toBeInTheDocument()
  })
})