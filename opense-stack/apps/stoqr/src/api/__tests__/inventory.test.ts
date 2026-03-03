import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../../supabaseClient', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
  db: {
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  bulkUpdateInventoryProducts,
  fetchInventoryReferenceData,
  fetchInventoryProducts,
  fetchInventoryStats,
  importInventoryProducts,
} from '../inventory'

const makeProductsQuery = (response: {
  data: unknown[] | null
  count: number | null
  error: { message: string } | null
}) => {
  const query = {
    select: vi.fn(() => query),
    eq: vi.fn(() => query),
    or: vi.fn(() => query),
    order: vi.fn(() => query),
    range: vi.fn(() => query),
    then: (resolve: (value: typeof response) => unknown) =>
      Promise.resolve(response).then(resolve),
  }

  return query
}

beforeEach(() => {
  vi.clearAllMocks()
})

describe('inventory api', () => {
  it('throws when fetchInventoryStats RPC returns an error', async () => {
    mockRpc.mockReturnValue({
      single: vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      }),
    })

    await expect(fetchInventoryStats('company-1')).rejects.toMatchObject({ message: 'RPC failed' })
    expect(mockRpc).toHaveBeenCalledWith('get_inventory_stats', { target_company_id: 'company-1' })
  })

  it('returns 0 and avoids insert when import rows are empty/invalid', async () => {
    const inserted = await importInventoryProducts('company-1', [
      { name: '', sku: '' },
      { Name: 'No SKU' },
      { SKU: 'NO-NAME' },
    ])

    expect(inserted).toBe(0)
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('applies pagination boundaries and low-stock filtering', async () => {
    const query = makeProductsQuery({
      data: [
        {
          id: 'p-1',
          name: 'Low item',
          sku: 'LOW-1',
          quantity_on_hand: 2,
          reorder_point: 5,
          folder_id: null,
          cost_price: 1,
          selling_price: 2,
        },
        {
          id: 'p-2',
          name: 'Healthy item',
          sku: 'OK-1',
          quantity_on_hand: 20,
          reorder_point: 5,
          folder_id: null,
          cost_price: 1,
          selling_price: 2,
        },
      ],
      count: 2,
      error: null,
    })

    mockFrom.mockReturnValue(query)

    const result = await fetchInventoryProducts({
      companyId: 'company-1',
      search: 'item',
      stockFilter: 'low',
      page: 2,
      pageSize: 25,
      sortField: 'name',
      sortDir: 'asc',
    })

    expect(query.range).toHaveBeenCalledWith(25, 49)
    expect(result.totalCount).toBe(2)
    expect(result.products).toHaveLength(1)
    expect(result.products[0]?.id).toBe('p-1')
  })

  it('fetches locations and barcodes reference data', async () => {
    const locationOrder = vi.fn().mockResolvedValue({
      data: [{ id: 'l-1', name: 'Main', code: 'WH-A', description: null }],
      error: null,
    })
    const barcodeOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'b-1',
          product_id: 'p-1',
          barcode: 'BC-1',
          barcode_type: 'barcode',
          is_primary: true,
          products: { id: 'p-1', name: 'Prod', sku: 'SKU-1' },
        },
      ],
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'inventory_locations') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: locationOrder })),
          })),
        }
      }

      if (table === 'product_barcodes') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: barcodeOrder })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await fetchInventoryReferenceData('company-1')
    expect(result.locations).toHaveLength(1)
    expect(result.barcodes[0]?.products?.sku).toBe('SKU-1')
  })

  it('bulk updates quantity and selling price for scoped products', async () => {
    const selectIn = vi.fn().mockResolvedValue({
      data: [
        { id: 'p-1', quantity_on_hand: 10, selling_price: 20 },
        { id: 'p-2', quantity_on_hand: 5, selling_price: 30 },
      ],
      error: null,
    })

    const updateEqCompany = vi.fn().mockResolvedValue({ error: null })
    const updateEqId = vi.fn(() => ({ eq: updateEqCompany }))
    const update = vi.fn(() => ({ eq: updateEqId }))

    mockFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ in: selectIn })),
          })),
          update,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const updated = await bulkUpdateInventoryProducts('company-1', {
      productIds: ['p-1', 'p-2'],
      quantityDelta: -2,
      priceMultiplier: 1.1,
    })

    expect(updated).toBe(2)
    expect(update).toHaveBeenCalled()
    expect(updateEqId).toHaveBeenCalledWith('id', 'p-1')
    expect(updateEqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })
})
