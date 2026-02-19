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
          category: null,
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
          category: null,
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
})
