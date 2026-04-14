import { fireEvent, render, screen } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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
          status: 'draft',
          approval_status: 'pending',
          return_status: 'none',
          expected_date: '2026-04-20',
          created_at: '2026-04-10T00:00:00Z',
          suppliers: { name: 'TechGlobal Inc.' },
        },
        {
          id: 'po-return',
          po_number: 1204,
          supplier_id: 'sup-2',
          status: 'partial',
          approval_status: 'approved',
          return_status: 'awaiting_return',
          expected_date: '2026-04-18',
          created_at: '2026-04-06T00:00:00Z',
          suppliers: { name: 'Apex Materials' },
        },
        {
          id: 'po-shipped',
          po_number: 1208,
          supplier_id: 'sup-2',
          status: 'closed',
          approval_status: 'approved',
          return_status: 'shipped',
          expected_date: '2026-04-09',
          created_at: '2026-04-02T00:00:00Z',
          suppliers: { name: 'Apex Materials' },
        },
        {
          id: 'po-denied',
          po_number: 1207,
          supplier_id: 'sup-1',
          status: 'cancelled',
          approval_status: 'denied',
          return_status: 'resolved',
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

  it('renders approval and return statuses from purchase order columns', () => {
    render(<PurchaseOrdersTab companyId="company-1" />)

    expect(screen.getByText('Pending Approval')).toBeInTheDocument()
    expect(screen.getAllByText('Approved')).toHaveLength(2)
    expect(screen.getByText('Denied')).toBeInTheDocument()
    expect(screen.getByText('Awaiting Return')).toBeInTheDocument()
    expect(screen.getByText('Shipped to Vendor')).toBeInTheDocument()
    expect(screen.getByText('Resolved')).toBeInTheDocument()
    expect(screen.getByText('12/18 units received')).toBeInTheDocument()
    expect(screen.getByText('No return')).toBeInTheDocument()
  })

  it('filters rows by workflow search text', () => {
    render(<PurchaseOrdersTab companyId="company-1" />)

    fireEvent.change(screen.getByPlaceholderText('Search POs...'), {
      target: { value: 'Shipped to Vendor' },
    })

    expect(screen.getByText('PO-2026-1208')).toBeInTheDocument()
    expect(screen.queryByText('PO-2026-1206')).not.toBeInTheDocument()
    expect(screen.queryByText('PO-2026-1204')).not.toBeInTheDocument()
  })
})