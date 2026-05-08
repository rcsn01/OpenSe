import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../Search/TopBarSearch'
import { LabelPreviewBatchTab } from '../LabelPreviewBatchTab'

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
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

vi.mock('../LabelPreviewCard', () => ({
  LabelPreviewCard: () => <div>Preview card</div>,
}))

describe('LabelPreviewBatchTab', () => {
  it('filters available templates from the shared top-bar search on preview and batch', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TopBarSearchProvider>
          <TopBarSearchContent />
          <LabelPreviewBatchTab companyId="company-1" />
        </TopBarSearchProvider>
      </MemoryRouter>,
    )

    const templateSelect = screen.getByLabelText('Template')
    expect(within(templateSelect).getByRole('option', { name: 'Shipping Label' })).toBeInTheDocument()
    expect(within(templateSelect).getByRole('option', { name: 'Returns Label' })).toBeInTheDocument()

    await user.type(screen.getByRole('combobox', { name: 'Search label products...' }), 'Returns')

    expect(within(templateSelect).getByRole('option', { name: 'Returns Label' })).toBeInTheDocument()
    expect(within(templateSelect).queryByRole('option', { name: 'Shipping Label' })).not.toBeInTheDocument()
  })
})
