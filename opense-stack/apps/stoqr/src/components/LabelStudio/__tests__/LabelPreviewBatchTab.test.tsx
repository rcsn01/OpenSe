import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabelPreviewBatchTab } from '../LabelPreviewBatchTab'

const mockCreatePdfDataUrl = vi.fn(async () => 'data:application/pdf;base64,ZmFrZQ==')
const mockMutateAsync = vi.fn(async () => undefined)

vi.mock('../pdfExport', () => ({
  createLabelPdfDataUrl: (...args: unknown[]) => mockCreatePdfDataUrl(...args),
}))

vi.mock('../../../hooks/queries/useLabelStudio', () => ({
  useLabelTemplates: () => ({
    data: [
      {
        id: 'template-1',
        company_id: 'company-1',
        name: 'Product Label',
        template_type: 'product',
        is_system: false,
        layout: {
          showQr: true,
          showBarcode: true,
          showSku: true,
          showName: true,
        },
        variable_fields: ['name', 'sku', 'barcode', 'qr'],
        created_at: '2026-02-20T00:00:00Z',
      },
    ],
    isLoading: false,
  }),
  useLabelProducts: () => ({
    data: [{ id: 'product-1', name: 'Milk', sku: 'MILK-001', folder_id: null }],
    isLoading: false,
  }),
  useLabelProductFolders: () => ({
    data: [{ id: 'folder-1', name: 'Dairy' }],
    isLoading: false,
  }),
  useCreateLabelPrintJob: () => ({
    mutateAsync: (...args: unknown[]) => mockMutateAsync(...args),
    isPending: false,
  }),
}))

describe('LabelPreviewBatchTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('exports pdf with generated output url for selected product', async () => {
    const user = userEvent.setup()

    render(<LabelPreviewBatchTab companyId="company-1" />)

    await user.selectOptions(screen.getByLabelText('Template'), 'template-1')
    await user.selectOptions(screen.getByLabelText('Product'), 'product-1')

    await user.click(screen.getByRole('button', { name: 'Export PDF' }))

    await waitFor(() => {
      expect(mockCreatePdfDataUrl).toHaveBeenCalledTimes(1)
    })

    expect(mockCreatePdfDataUrl).toHaveBeenCalledWith(
      expect.objectContaining({
        templateName: 'Product Label',
        quantity: 1,
      }),
    )

    await waitFor(() => {
      expect(mockMutateAsync).toHaveBeenCalledWith(
        expect.objectContaining({
          templateId: 'template-1',
          format: 'pdf',
          outputUrl: 'data:application/pdf;base64,ZmFrZQ==',
        }),
      )
    })

    expect(screen.getByText('PDF exported. Open the Downloads tab to download it.')).toBeInTheDocument()
  })

  it('shows validation error when exporting without template', async () => {
    const user = userEvent.setup()

    render(<LabelPreviewBatchTab companyId="company-1" />)

    await user.click(screen.getByRole('button', { name: 'Export PDF' }))

    expect(screen.getByText('Select template and valid quantity.')).toBeInTheDocument()
    expect(mockCreatePdfDataUrl).not.toHaveBeenCalled()
  })
})
