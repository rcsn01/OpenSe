import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../Search/TopBarSearch'
import { PurchaseOrdersTab } from '../PurchaseOrdersTab'

const mocks = vi.hoisted(() => ({
  useCreatePurchaseOrder: vi.fn(),
  useProcurementPurchaseOrderItems: vi.fn(),
  useProcurementPurchaseOrders: vi.fn(),
  useProcurementSuppliers: vi.fn(),
  useProcurementProducts: vi.fn(),
}))

vi.mock('../../../hooks/queries/useProcurementTabs', () => ({
  useCreatePurchaseOrder: (...args: unknown[]) => mocks.useCreatePurchaseOrder(...args),
  useProcurementPurchaseOrderItems: (...args: unknown[]) => mocks.useProcurementPurchaseOrderItems(...args),
  useProcurementPurchaseOrders: (...args: unknown[]) => mocks.useProcurementPurchaseOrders(...args),
  useProcurementSuppliers: (...args: unknown[]) => mocks.useProcurementSuppliers(...args),
}))

vi.mock('../../../hooks/queries/useProcurement', () => ({
  useProcurementProducts: (...args: unknown[]) => mocks.useProcurementProducts(...args),
}))

describe('PurchaseOrdersTab', () => {
  const renderPurchaseOrdersTab = () => render(
    <MemoryRouter initialEntries={['/']}>
      <TopBarSearchProvider>
        <TopBarSearchContent />
        <PurchaseOrdersTab companyId="company-1" />
      </TopBarSearchProvider>
    </MemoryRouter>,
  )

  beforeEach(() => {
    mocks.useCreatePurchaseOrder.mockReturnValue({
      mutateAsync: vi.fn(),
      isPending: false,
    })
    mocks.useProcurementSuppliers.mockReturnValue({
      data: [
        { id: 'sup-1', name: 'TechGlobal Inc.', contact_name: null, email: null, phone: null },
        { id: 'sup-2', name: 'Apex Materials', contact_name: null, email: null, phone: null },
      ],
      isLoading: false,
    })
    mocks.useProcurementProducts.mockReturnValue({
      data: [
        { id: 'prod-1', name: 'PCR Tips', sku: 'TIP-001', quantity_on_hand: 8, reorder_point: 12 },
      ],
    })
    mocks.useProcurementPurchaseOrders.mockReturnValue({
      data: [
        {
          id: 'po-pending',
          po_number: 1206,
          supplier_id: 'sup-1',
          status: 'pending_approval',
          expected_date: '2026-04-20',
          created_at: '2026-04-10T00:00:00Z',
          suppliers: { name: 'TechGlobal Inc.' },
        },
        {
          id: 'po-return',
          po_number: 1204,
          supplier_id: 'sup-2',
          status: 'awaiting_return',
          expected_date: '2026-04-18',
          created_at: '2026-04-06T00:00:00Z',
          suppliers: { name: 'Apex Materials' },
        },
        {
          id: 'po-shipped',
          po_number: 1208,
          supplier_id: 'sup-2',
          status: 'shipped_to_vendor',
          expected_date: '2026-04-09',
          created_at: '2026-04-02T00:00:00Z',
          suppliers: { name: 'Apex Materials' },
        },
        {
          id: 'po-denied',
          po_number: 1207,
          supplier_id: 'sup-1',
          status: 'denied',
          expected_date: '2026-04-17',
          created_at: '2026-04-03T00:00:00Z',
          suppliers: { name: 'TechGlobal Inc.' },
        },
      ],
      isLoading: false,
    })
    mocks.useProcurementPurchaseOrderItems.mockReturnValue({
      data: [
        { id: 'item-1', po_id: 'po-pending', product_id: 'prod-1', quantity_ordered: 24, quantity_received: 0, unit_cost: 10, products: null, purchase_orders: null },
        { id: 'item-2', po_id: 'po-return', product_id: 'prod-1', quantity_ordered: 18, quantity_received: 12, unit_cost: 7.5, products: null, purchase_orders: null },
        { id: 'item-3', po_id: 'po-shipped', product_id: 'prod-1', quantity_ordered: 12, quantity_received: 12, unit_cost: 9, products: null, purchase_orders: null },
        { id: 'item-4', po_id: 'po-denied', product_id: 'prod-1', quantity_ordered: 10, quantity_received: 10, unit_cost: 11, products: null, purchase_orders: null },
      ],
    })
  })

  it('renders single workflow statuses from purchase order status', () => {
    renderPurchaseOrdersTab()

    expect(screen.getAllByText('Pending Approval').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Denied').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Awaiting Return').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Shipped to Vendor').length).toBeGreaterThan(0)
    expect(screen.getByText('12/18 units received')).toBeInTheDocument()
  })

  it('filters rows from the shared top bar search term', async () => {
    const user = userEvent.setup()
    renderPurchaseOrdersTab()

    await user.type(screen.getByRole('combobox', { name: 'Search POs...' }), 'Shipped to Vendor')

    expect(screen.getAllByText('PO-2026-1208').length).toBeGreaterThan(0)
    expect(screen.queryByText('PO-2026-1206')).not.toBeInTheDocument()
    expect(screen.queryByText('PO-2026-1204')).not.toBeInTheDocument()
  })

  it('supports fuzzy search matches from the shared top bar', async () => {
    const user = userEvent.setup()
    renderPurchaseOrdersTab()

    await user.type(screen.getByRole('combobox', { name: 'Search POs...' }), 'ship vendor')

    expect(screen.getAllByText('PO-2026-1208').length).toBeGreaterThan(0)
    expect(screen.queryByText('PO-2026-1206')).not.toBeInTheDocument()
    expect(screen.queryByText('PO-2026-1204')).not.toBeInTheDocument()
  })

  it('filters rows using the shared status dropdown', async () => {
    const user = userEvent.setup()

    renderPurchaseOrdersTab()

    await user.click(screen.getByRole('button', { name: 'Purchase order status filter' }))
    await user.click(screen.getByRole('button', { name: 'Shipped to Vendor' }))

    expect(screen.getByText('PO-2026-1208')).toBeInTheDocument()
    expect(screen.queryByText('PO-2026-1206')).not.toBeInTheDocument()
    expect(screen.queryByText('PO-2026-1204')).not.toBeInTheDocument()
    expect(screen.queryByText('PO-2026-1207')).not.toBeInTheDocument()
  })

  it('orders toolbar controls with filter on the left and actions on the right', () => {
    renderPurchaseOrdersTab()

    const filterButton = screen.getByRole('button', { name: 'Purchase order status filter' })
    const autoGenerateButton = screen.getByRole('button', { name: /auto-generate from alerts/i })
    const createButton = screen.getByRole('button', { name: /create po/i })

    expect(filterButton.compareDocumentPosition(autoGenerateButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
    expect(autoGenerateButton.compareDocumentPosition(createButton) & Node.DOCUMENT_POSITION_FOLLOWING).toBeTruthy()
  })
})
