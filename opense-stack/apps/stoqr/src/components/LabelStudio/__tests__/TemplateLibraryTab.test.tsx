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

  it('shows the redesigned template library columns and field chips', () => {
    render(<TemplateLibraryTab companyId="company-1" />)

    expect(screen.getByRole('columnheader', { name: 'Template Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Dimensions' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Active Fields' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Last Modified' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Actions' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Source' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Type' })).not.toBeInTheDocument()

    expect(screen.getAllByText('100x50mm').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Name').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SKU').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Barcode').length).toBeGreaterThan(0)
  })

  it('opens the designer when the template row is activated', async () => {
    const user = userEvent.setup()
    const onSelectTemplate = vi.fn()

    render(<TemplateLibraryTab companyId="company-1" onSelectTemplate={onSelectTemplate} />)

    await user.click(screen.getByRole('button', { name: 'Open Product Label template' }))

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1')
  })
})
