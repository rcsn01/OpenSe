import { fireEvent, render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../Search/TopBarSearch'
import { LabelPreviewBatchTab } from '../LabelPreviewBatchTab'

const { mockMutateAsync } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(),
}))

vi.mock('../../../hooks/queries/useLabelStudio', () => ({
  useLabelTemplates: () => ({
    data: [
      {
        id: 'template-1',
        company_id: 'company-1',
        name: 'Shipping Label',
        is_system: false,
        layout: {},
        variable_fields: ['barcode', 'sku'],
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-03T00:00:00.000Z',
      },
      {
        id: 'template-2',
        company_id: 'company-1',
        name: 'Returns Label',
        is_system: false,
        layout: {},
        variable_fields: ['barcode', 'qr'],
        created_at: '2026-05-01T00:00:00.000Z',
        updated_at: '2026-05-04T00:00:00.000Z',
      },
    ],
    isLoading: false,
  }),
  useLabelProducts: () => ({
    data: [
      { id: 'prod-1', sku: 'SHIP-100', name: 'Shipping Box' },
      { id: 'prod-2', sku: 'RET-200', name: 'Returns Envelope' },
    ],
    isLoading: false,
  }),
  useLabelProductFolders: () => ({
    data: [{ id: 'folder-1', name: 'Main Warehouse' }],
    isLoading: false,
  }),
  useCreateLabelPrintJob: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

vi.mock('../LabelPreviewCard', () => ({
  LabelPreviewCard: () => <div>Preview card</div>,
}))

vi.mock('../downloadLabelPdf', () => ({
  downloadLabelPdf: vi.fn(),
}))

vi.mock('../pdfExport', () => ({
  createLabelPdfDataUrl: vi.fn(async () => 'data:application/pdf;base64,stub'),
}))

const renderPreviewBatchTab = () =>
  render(
    <MemoryRouter>
      <TopBarSearchProvider>
        <TopBarSearchContent />
        <LabelPreviewBatchTab companyId="company-1" />
      </TopBarSearchProvider>
    </MemoryRouter>,
  )

describe('LabelPreviewBatchTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('filters available templates from the shared top-bar search on preview and batch', async () => {
    const user = userEvent.setup()
    renderPreviewBatchTab()

    const templateSelect = screen.getByLabelText('Template')
    expect(within(templateSelect).getByRole('option', { name: 'Shipping Label' })).toBeInTheDocument()
    expect(within(templateSelect).getByRole('option', { name: 'Returns Label' })).toBeInTheDocument()

    await user.type(screen.getByRole('combobox', { name: 'Search label products...' }), 'Returns')

    expect(within(templateSelect).getByRole('option', { name: 'Returns Label' })).toBeInTheDocument()
    expect(within(templateSelect).queryByRole('option', { name: 'Shipping Label' })).not.toBeInTheDocument()
  })

  it('switches target modes and clears the previous product selection', async () => {
    const user = userEvent.setup()
    renderPreviewBatchTab()

    await user.type(screen.getByLabelText('Product Search'), 'SHIP')
    await user.click(screen.getByRole('button', { name: /Shipping Box/i }))

    expect(screen.getByText('Shipping Box')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Multiple' }))

    expect(screen.getByText('No products selected.')).toBeInTheDocument()
    expect(screen.queryByText('Shipping Box')).not.toBeInTheDocument()

    await user.type(screen.getByLabelText('Product Search'), 'RET')
    await user.click(screen.getByRole('button', { name: /Returns Envelope/i }))

    expect(screen.getByText('Returns Envelope')).toBeInTheDocument()
    expect(screen.queryByText('RET-200')).not.toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Folder' }))

    expect(screen.getByLabelText('Folder')).toBeInTheDocument()
    expect(screen.queryByText('Returns Envelope')).not.toBeInTheDocument()
  })

  it('makes the multiple selected products list a dedicated scroll region', async () => {
    const user = userEvent.setup()
    renderPreviewBatchTab()

    await user.click(screen.getByRole('radio', { name: 'Multiple' }))

    expect(screen.getByRole('region', { name: 'Selected products' })).toHaveClass('is-scrollable')
  })

  it('updates quantity without rendering a generated label summary', async () => {
    const user = userEvent.setup()
    renderPreviewBatchTab()

    await user.selectOptions(screen.getByLabelText('Template'), 'template-1')
    await user.type(screen.getByLabelText('Product Search'), 'SHIP')
    await user.click(screen.getByRole('button', { name: /Shipping Box/i }))
    fireEvent.change(screen.getByLabelText('Quantity'), { target: { value: '3' } })

    expect(screen.getByLabelText('Quantity')).toHaveValue(3)
    expect(screen.queryByText(/Generates \d+ PDF/i)).not.toBeInTheDocument()
  })

  it('renders the PDF preview as the dedicated scroll region', () => {
    renderPreviewBatchTab()

    const previewRegion = screen.getByRole('region', { name: 'PDF preview' })
    expect(previewRegion).toHaveClass('label-batch-preview-canvas')
    expect(within(previewRegion).getByText('Preview card')).toBeInTheDocument()
  })

  it('validates missing export template, product, and folder states', async () => {
    const user = userEvent.setup()
    renderPreviewBatchTab()

    await user.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(screen.getByText('Select template and valid quantity.')).toBeInTheDocument()

    await user.selectOptions(screen.getByLabelText('Template'), 'template-1')
    await user.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(screen.getByText('Select a product.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Multiple' }))
    await user.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(screen.getByText('Select at least one product.')).toBeInTheDocument()

    await user.click(screen.getByRole('radio', { name: 'Folder' }))
    await user.click(screen.getByRole('button', { name: 'Export PDF' }))
    expect(screen.getByText('Select a folder.')).toBeInTheDocument()
  })
})
