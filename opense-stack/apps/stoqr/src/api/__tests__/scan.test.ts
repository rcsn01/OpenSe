import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()
const mockSupabaseFrom = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
  supabase: {
    auth: {
      getUser: vi.fn(),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
  },
}))

import {
  createQuickScanTransaction,
  fetchScanHistory,
  lookupProductByScanValue,
} from '../scan'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('scan api', () => {
  it('falls back to product barcode lookup when direct product lookup misses', async () => {
    const productsQuery = {
      select: vi.fn(() => productsQuery),
      eq: vi.fn(() => productsQuery),
      or: vi.fn(() => productsQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    const barcodesQuery = {
      select: vi.fn(() => barcodesQuery),
      eq: vi.fn(() => barcodesQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          barcode: 'BC-100',
          product_id: 'p-1',
          products: {
            id: 'p-1',
            name: 'Barcode Product',
            sku: 'SKU-100',
            quantity_on_hand: 12,
            reorder_point: 4,
            description: null,
            category: null,
            cost_price: null,
            selling_price: null,
            folder_id: null,
            image_urls: [],
            custom_fields: {},
            expiry_date: null,
          },
        },
        error: null,
      }),
    }

    const transactionsQuery = {
      select: vi.fn(() => transactionsQuery),
      eq: vi.fn(() => transactionsQuery),
      order: vi.fn(() => transactionsQuery),
      limit: vi.fn(() => transactionsQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { performed_by: 'user-1' }, error: null }),
    }

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') return productsQuery
      if (table === 'product_barcodes') return barcodesQuery
      if (table === 'inventory_transactions') return transactionsQuery
      throw new Error(`Unexpected table: ${table}`)
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected supabase table: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { full_name: 'Alex User', username: null }, error: null }),
          }),
        }),
      }
    })

    const result = await lookupProductByScanValue('company-1', 'BC-100')

    expect(result.product?.id).toBe('p-1')
    expect(result.product?.sku).toBe('SKU-100')
    expect(result.lastHandledBy).toBe('Alex User')
    expect(result.notFoundSku).toBeNull()
  })

  it('falls back to product name search when sku/barcode lookup misses', async () => {
    const initialProductsQuery = {
      select: vi.fn(() => initialProductsQuery),
      eq: vi.fn(() => initialProductsQuery),
      or: vi.fn(() => initialProductsQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    const barcodesQuery = {
      select: vi.fn(() => barcodesQuery),
      eq: vi.fn(() => barcodesQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: null, error: null }),
    }

    const nameProductsQuery = {
      select: vi.fn(() => nameProductsQuery),
      eq: vi.fn(() => nameProductsQuery),
      ilike: vi.fn(() => nameProductsQuery),
      order: vi.fn(() => nameProductsQuery),
      limit: vi.fn(() => nameProductsQuery),
      maybeSingle: vi.fn().mockResolvedValue({
        data: {
          id: 'p-name-1',
          name: 'Milk 2L',
          sku: 'MILK-2L',
          quantity_on_hand: 8,
          reorder_point: 2,
          description: null,
          category: null,
          cost_price: null,
          selling_price: null,
          folder_id: null,
          image_urls: [],
          custom_fields: {},
          expiry_date: null,
        },
        error: null,
      }),
    }

    const transactionsQuery = {
      select: vi.fn(() => transactionsQuery),
      eq: vi.fn(() => transactionsQuery),
      order: vi.fn(() => transactionsQuery),
      limit: vi.fn(() => transactionsQuery),
      maybeSingle: vi.fn().mockResolvedValue({ data: { performed_by: 'user-1' }, error: null }),
    }

    let productsCallCount = 0
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        productsCallCount += 1
        return productsCallCount === 1 ? initialProductsQuery : nameProductsQuery
      }
      if (table === 'product_barcodes') return barcodesQuery
      if (table === 'inventory_transactions') return transactionsQuery
      throw new Error(`Unexpected table: ${table}`)
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected supabase table: ${table}`)
      return {
        select: () => ({
          eq: () => ({
            maybeSingle: async () => ({ data: { full_name: 'Name Match User', username: null }, error: null }),
          }),
        }),
      }
    })

    const result = await lookupProductByScanValue('company-1', 'milk')

    expect(nameProductsQuery.ilike).toHaveBeenCalledWith('name', '%milk%')
    expect(result.product?.id).toBe('p-name-1')
    expect(result.product?.name).toBe('Milk 2L')
    expect(result.notFoundSku).toBeNull()
  })

  it('creates scan_out transaction and writes scan event log', async () => {
    const inventoryInsert = vi.fn(() => ({
      select: vi.fn(() => ({
        single: vi.fn().mockResolvedValue({
          data: { id: 'tx-1' },
          error: null,
        }),
      })),
    }))

    const scanEventsInsert = vi.fn().mockResolvedValue({ error: null })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        return { insert: inventoryInsert }
      }
      if (table === 'scan_events') {
        return { insert: scanEventsInsert }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await createQuickScanTransaction({
      companyId: 'company-1',
      productId: 'p-1',
      userId: 'user-1',
      transactionType: 'scan_out',
      quantity: 3,
      barcode: 'BC-100',
      entryMethod: 'camera',
    })

    expect(inventoryInsert).toHaveBeenCalledWith(expect.objectContaining({
      transaction_type: 'scan_out',
      quantity_change: -3,
      source: 'scan',
    }))

    expect(scanEventsInsert).toHaveBeenCalledWith(expect.objectContaining({
      scan_type: 'stock_out',
      quantity: 3,
      entry_method: 'camera',
      transaction_id: 'tx-1',
    }))
  })

  it('fetches scan history and enriches actor names', async () => {
    const historyQuery = {
      select: vi.fn(() => historyQuery),
      eq: vi.fn(() => historyQuery),
      order: vi.fn(() => historyQuery),
      limit: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'scan-1',
            created_at: '2026-02-24T00:00:00Z',
            barcode: 'BC-100',
            scan_type: 'stock_in',
            quantity: 5,
            entry_method: 'manual',
            scanned_by: 'user-1',
            products: { id: 'p-1', name: 'Item 1', sku: 'SKU-1' },
            inventory_transactions: { transaction_type: 'scan_in' },
          },
        ],
        error: null,
      }),
    }

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'scan_events') return historyQuery
      throw new Error(`Unexpected table: ${table}`)
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected supabase table: ${table}`)
      return {
        select: () => ({
          in: async () => ({
            data: [{ id: 'user-1', full_name: 'Pat Scanner', username: null }],
            error: null,
          }),
        }),
      }
    })

    const rows = await fetchScanHistory('company-1')

    expect(rows).toHaveLength(1)
    expect(rows[0]).toMatchObject({
      id: 'scan-1',
      scan_type: 'stock_in',
      actorName: 'Pat Scanner',
      transactionType: 'scan_in',
    })
  })
})
