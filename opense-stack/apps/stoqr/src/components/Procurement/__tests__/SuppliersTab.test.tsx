import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../Search/TopBarSearch'
import { SuppliersTab } from '../SuppliersTab'

vi.mock('../../../hooks/queries/useProcurementTabs', () => ({
  useProcurementSuppliers: () => ({
    data: [
      {
        id: 'sup-1',
        name: 'Acme Medical',
        contact_name: 'Alex Mercer',
        email: 'alex@acme.test',
        phone: '555-1000',
      },
      {
        id: 'sup-2',
        name: 'Zenith Components',
        contact_name: 'Jamie Cross',
        email: 'jamie@zenith.test',
        phone: '555-2000',
      },
    ],
    isLoading: false,
  }),
  useProcurementPurchaseOrders: () => ({
    data: [
      {
        id: 'po-1',
        supplier_id: 'sup-1',
        status: 'closed',
        expected_date: '2026-05-01',
      },
      {
        id: 'po-2',
        supplier_id: 'sup-2',
        status: 'sent',
        expected_date: '2026-05-04',
      },
    ],
  }),
  useProcurementPurchaseOrderItems: () => ({
    data: [
      {
        po_id: 'po-1',
        quantity_ordered: 10,
        quantity_received: 10,
        products: { sku: 'MED-100' },
      },
      {
        po_id: 'po-2',
        quantity_ordered: 8,
        quantity_received: 6,
        products: { sku: 'CMP-200' },
      },
    ],
  }),
  useProcurementReceivingLogs: () => ({
    data: [
      { po_id: 'po-1', received_at: '2026-05-01T10:00:00.000Z' },
      { po_id: 'po-2', received_at: '2026-05-05T10:00:00.000Z' },
    ],
  }),
  useCreateProcurementSupplier: () => ({
    mutateAsync: vi.fn(),
    isPending: false,
  }),
}))

describe('SuppliersTab', () => {
  it('filters supplier cards from the shared top-bar search', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter>
        <TopBarSearchProvider>
          <TopBarSearchContent />
          <SuppliersTab companyId="company-1" />
        </TopBarSearchProvider>
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Acme Medical' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Zenith Components' })).toBeInTheDocument()

    await user.type(screen.getByRole('combobox', { name: 'Search suppliers...' }), 'Zenith')

    expect(screen.getByRole('heading', { name: 'Zenith Components' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'Acme Medical' })).not.toBeInTheDocument()
  })
})
