import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
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
  const renderTemplateLibrary = (ui: React.ReactNode) => render(
    <MemoryRouter>
      {ui}
    </MemoryRouter>,
  )

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
    renderTemplateLibrary(<TemplateLibraryTab companyId="company-1" selectedTemplateId="template-1" />)

    expect(screen.getByRole('columnheader', { name: 'Template Name' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Dimensions' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Active Fields' })).toBeInTheDocument()
    expect(screen.getByRole('columnheader', { name: 'Last Modified' })).toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Actions' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Source' })).not.toBeInTheDocument()
    expect(screen.queryByRole('columnheader', { name: 'Type' })).not.toBeInTheDocument()
    expect(screen.queryByText('Editing')).not.toBeInTheDocument()

    expect(screen.getAllByText('100x50mm').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Name').length).toBeGreaterThan(0)
    expect(screen.getAllByText('SKU').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Barcode').length).toBeGreaterThan(0)
  })

  it('opens the designer when the table row is clicked', async () => {
    const user = userEvent.setup()
    const onSelectTemplate = vi.fn()

    renderTemplateLibrary(<TemplateLibraryTab companyId="company-1" onSelectTemplate={onSelectTemplate} />)

    await user.click(screen.getByText('100x50mm'))

    expect(onSelectTemplate).toHaveBeenCalledWith('template-1')
  })

  it('opens the create form from the table top row', async () => {
    const user = userEvent.setup()

    renderTemplateLibrary(<TemplateLibraryTab companyId="company-1" />)

    await user.click(screen.getByRole('button', { name: 'Create new template' }))

    expect(screen.getByLabelText('Template Name')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Hide new template' })).toBeInTheDocument()
  })
})
