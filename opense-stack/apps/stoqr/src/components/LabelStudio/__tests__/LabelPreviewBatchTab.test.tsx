import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { LabelPreviewBatchTab } from '../LabelPreviewBatchTab'

const { mockCreatePdfDataUrl, mockDownloadLabelPdf, mockMutateAsync } = vi.hoisted(() => ({
  mockCreatePdfDataUrl: vi.fn(async (_args?: unknown) => 'data:application/pdf;base64,ZmFrZQ=='),
  mockDownloadLabelPdf: vi.fn(),
  mockMutateAsync: vi.fn(async (_args?: unknown) => undefined),
}))

vi.mock('../pdfExport', () => ({
  createLabelPdfDataUrl: mockCreatePdfDataUrl,
}))

vi.mock('../downloadLabelPdf', () => ({
  downloadLabelPdf: (...args: unknown[]) => mockDownloadLabelPdf(...args),
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
          showQr: true,
          showBarcode: true,
          showSku: true,
          showName: true,
        },
        variable_fields: ['name', 'sku', 'barcode', 'qr'],
        created_at: '2026-02-20T00:00:00Z',
        updated_at: null,
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
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

describe('LabelPreviewBatchTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders the redesigned export and preview shell', () => {
    render(<LabelPreviewBatchTab companyId="company-1" />)

    expect(screen.getByText('Export & Batch')).toBeInTheDocument()
    expect(screen.getByText('A4 Layout Preview')).toBeInTheDocument()
    expect(screen.queryByText('Recent Exports')).not.toBeInTheDocument()
  })

  it('renders the shared PDF page preview for the selected export target', async () => {
    const user = userEvent.setup()

    render(<LabelPreviewBatchTab companyId="company-1" />)

    await user.selectOptions(screen.getByLabelText('Template'), 'template-1')
    await user.type(screen.getByLabelText('Product Search'), 'Milk')
    await user.click(screen.getByRole('button', { name: /Milk/i }))

    expect(screen.getByLabelText('PDF page preview')).toBeInTheDocument()
    expect(screen.getByText('Page 1 of 1')).toBeInTheDocument()
    expect(screen.getByText('Generates 1 PDF page across 1 label.')).toBeInTheDocument()
  })

  it('exports pdf with generated output url for selected product', async () => {
    const user = userEvent.setup()

    render(<LabelPreviewBatchTab companyId="company-1" />)

    await user.selectOptions(screen.getByLabelText('Template'), 'template-1')
    await user.type(screen.getByLabelText('Product Search'), 'Milk')
    await user.click(screen.getByRole('button', { name: /Milk/i }))

    await user.click(screen.getByRole('button', { name: /Export PDF/i }))

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

    expect(mockDownloadLabelPdf).toHaveBeenCalledWith(
      'data:application/pdf;base64,ZmFrZQ==',
      expect.stringMatching(/\.pdf$/),
    )

    expect(screen.getByText('PDF downloaded.')).toBeInTheDocument()
  })

  it('shows validation error when exporting without template', async () => {
    const user = userEvent.setup()

    render(<LabelPreviewBatchTab companyId="company-1" />)

    await user.click(screen.getByRole('button', { name: /Export PDF/i }))

    expect(screen.getByText('Select template and valid quantity.')).toBeInTheDocument()
    expect(mockCreatePdfDataUrl).not.toHaveBeenCalled()
  })
})
