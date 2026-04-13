import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { TemplateLibraryTab } from '../TemplateLibraryTab'

const { mockMutateAsync, mockUseLabelTemplates } = vi.hoisted(() => ({
  mockMutateAsync: vi.fn(async (_args?: unknown) => undefined),
  mockUseLabelTemplates: vi.fn(),
}))

vi.mock('../../../hooks/queries/useLabelStudio', () => ({
  useLabelTemplates: (...args: unknown[]) => mockUseLabelTemplates(...args),
  useCreateLabelTemplate: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

describe('TemplateLibraryTab', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseLabelTemplates.mockReturnValue({
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
            textAlign: 'left',
            showName: true,
            showSku: true,
            showPrice: false,
            showBarcode: true,
            showQr: false,
          },
          variable_fields: ['name', 'sku', 'price', 'barcode', 'qr'],
          created_at: '2026-04-07T00:00:00Z',
          updated_at: '2026-04-07T00:00:00Z',
        },
      ],
      isLoading: false,
    })
  })

  it('shows size, type, and fields columns instead of source and action', () => {
    render(<TemplateLibraryTab companyId="company-1" />)

    expect(screen.getByRole('columnheader', { name: 'Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Size' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Type' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Fields' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Source' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Action' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /Edit Product Label template/i })).not.toBeInTheDocument()

    expect(screen.getByText('100mm x 50mm')).toBeInTheDocument()
    expect(screen.getByText('12pt / left')).toBeInTheDocument()
    expect(screen.getByText('Name, SKU, Barcode')).toBeInTheDocument()
  })

  it('opens the designer when the first cell is clicked', async () => {
    const user = userEvent.setup()
    const onSelectTemplate = vi.fn()

    render(<TemplateLibraryTab companyId="company-1" onSelectTemplate={onSelectTemplate} />)

    const nameCell = screen.getByText('Product Label').closest('td')
    if (!nameCell) throw new Error('Expected template name cell to exist')

    await user.click(nameCell)

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1')
  })
})
