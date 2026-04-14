import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
}))

import {
  createPurchaseOrder,
  createPurchaseOrderItem,
  fetchPurchaseOrders,
  fetchPurchaseOrderHistory,
  fetchPurchaseOrderItems,
  recordPurchaseOrderReceipt,
} from '../procurement'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('procurement api', () => {
  it('fetches purchase orders with approval and return statuses', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'po-1',
          po_number: 1001,
          supplier_id: 'sup-1',
          status: 'closed',
          approval_status: 'approved',
          return_status: 'resolved',
          expected_date: '2026-03-01',
          created_at: '2026-02-20T00:00:00Z',
          suppliers: { name: 'TechGlobal Inc.' },
        },
      ],
      error: null,
    })

    const eq = vi.fn(() => ({ order }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return {
          select: vi.fn(() => ({ eq })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const rows = await fetchPurchaseOrders('company-1')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'po-1',
      approval_status: 'approved',
      return_status: 'resolved',
    })
    expect(eq).toHaveBeenCalledWith('company_id', 'company-1')
  })

  it('creates purchase orders with default approval and return statuses', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return { insert }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await createPurchaseOrder('company-1', {
      supplierId: 'sup-1',
      expectedDate: '2026-04-20',
    })

    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      supplier_id: 'sup-1',
      expected_date: '2026-04-20',
      status: 'draft',
      approval_status: 'pending',
      return_status: 'none',
    })
  })

  it('fetches purchase order items with related order and product data', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'item-1',
          po_id: 'po-1',
          product_id: 'p-1',
          quantity_ordered: 10,
          quantity_received: 4,
          unit_cost: 2.5,
          products: { id: 'p-1', name: 'Widget', sku: 'W-1' },
          purchase_orders: { id: 'po-1', po_number: 1001, status: 'partial', expected_date: '2026-03-01' },
        },
      ],
      error: null,
    })

    const eq = vi.fn(() => ({ order }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'purchase_order_items') {
        return {
          select: vi.fn(() => ({ eq })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const rows = await fetchPurchaseOrderItems('company-1')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'item-1',
      po_id: 'po-1',
      quantity_ordered: 10,
      quantity_received: 4,
      products: { name: 'Widget', sku: 'W-1' },
    })
    expect(eq).toHaveBeenCalledWith('purchase_orders.company_id', 'company-1')
  })

  it('creates purchase order item only for orders in company scope', async () => {
    const maybeSingle = vi.fn().mockResolvedValue({ data: { id: 'po-1' }, error: null })
    const orderEqCompany = vi.fn(() => ({ maybeSingle }))
    const orderEqId = vi.fn(() => ({ eq: orderEqCompany }))
    const insert = vi.fn().mockResolvedValue({ error: null })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return {
          select: vi.fn(() => ({
            eq: orderEqId,
          })),
        }
      }

      if (table === 'purchase_order_items') {
        return { insert }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await createPurchaseOrderItem('company-1', {
      poId: 'po-1',
      productId: 'p-1',
      quantityOrdered: 12,
      unitCost: 1.75,
    })

    expect(orderEqId).toHaveBeenCalledWith('id', 'po-1')
    expect(orderEqCompany).toHaveBeenCalledWith('company_id', 'company-1')
    expect(insert).toHaveBeenCalledWith({
      po_id: 'po-1',
      product_id: 'p-1',
      quantity_ordered: 12,
      quantity_received: 0,
      unit_cost: 1.75,
    })
  })

  it('records partial receipt and updates item status', async () => {
    const itemMaybeSingle = vi.fn().mockResolvedValue({
      data: { id: 'item-1', quantity_ordered: 10, quantity_received: 4 },
      error: null,
    })
    const itemUpdateEq = vi.fn().mockResolvedValue({ error: null })

    const productMaybeSingle = vi.fn().mockResolvedValue({ data: { quantity_on_hand: 7 }, error: null })
    const productUpdateEqCompany = vi.fn().mockResolvedValue({ error: null })
    const productUpdateEqId = vi.fn(() => ({ eq: productUpdateEqCompany }))

    const poItemsForStatusEq = vi.fn().mockResolvedValue({
      data: [{ quantity_ordered: 10, quantity_received: 7 }],
      error: null,
    })

    const poUpdateEq = vi.fn().mockResolvedValue({ error: null })

    const insertReceiving = vi.fn().mockResolvedValue({ error: null })
    const insertTx = vi.fn().mockResolvedValue({ error: null })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'purchase_order_items') {
        return {
          select: vi
            .fn()
            .mockReturnValueOnce({
              eq: vi.fn(() => ({
                eq: vi.fn(() => ({ maybeSingle: itemMaybeSingle })),
              })),
            })
            .mockReturnValueOnce({ eq: poItemsForStatusEq }),
          update: vi.fn(() => ({ eq: itemUpdateEq })),
        }
      }

      if (table === 'receiving_logs') {
        return { insert: insertReceiving }
      }

      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ maybeSingle: productMaybeSingle })),
            })),
          })),
          update: vi.fn(() => ({ eq: productUpdateEqId })),
        }
      }

      if (table === 'inventory_transactions') {
        return { insert: insertTx }
      }

      if (table === 'purchase_orders') {
        return {
          update: vi.fn(() => ({ eq: poUpdateEq })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await recordPurchaseOrderReceipt('company-1', {
      poId: 'po-1',
      productId: 'p-1',
      quantityReceived: 3,
      notes: 'first pallet',
    })

    expect(itemUpdateEq).toHaveBeenCalledWith('id', 'item-1')
    expect(insertReceiving).toHaveBeenCalledWith(expect.objectContaining({
      company_id: 'company-1',
      po_id: 'po-1',
      product_id: 'p-1',
      quantity_received: 3,
    }))
    expect(productUpdateEqId).toHaveBeenCalledWith('id', 'p-1')
    expect(productUpdateEqCompany).toHaveBeenCalledWith('company_id', 'company-1')
    expect(insertTx).toHaveBeenCalledWith(expect.objectContaining({
      transaction_type: 'purchase',
      source: 'receiving',
      quantity_change: 3,
    }))
    expect(poUpdateEq).toHaveBeenCalledWith('id', 'po-1')
  })

  it('fetches only closed/cancelled purchase order history', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ id: 'po-2', po_number: 1002, status: 'closed', created_at: '2026-02-24T00:00:00Z' }],
      error: null,
    })

    const inStatus = vi.fn(() => ({ order }))
    const eqCompany = vi.fn(() => ({ in: inStatus }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'purchase_orders') {
        return {
          select: vi.fn(() => ({ eq: eqCompany })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const rows = await fetchPurchaseOrderHistory('company-1')

    expect(rows).toHaveLength(1)
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
    expect(inStatus).toHaveBeenCalledWith('status', ['closed', 'cancelled'])
    expect(order).toHaveBeenCalledWith('updated_at', { ascending: false })
  })
})
