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
  createFolderInInventory,
  deleteFolderInInventory,
  fetchInventoryFilters,
  fetchInventoryReferenceData,
  fetchInventoryProducts,
  fetchInventoryStats,
  importInventoryProducts,
  moveInventoryProducts,
  moveFolderInInventory,
  renameFolderInInventory,
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
    contains: vi.fn(() => query),
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

  it('applies custom field filtering when key and value are selected', async () => {
    const query = makeProductsQuery({
      data: [
        {
          id: 'p-1',
          name: 'Batch product',
          sku: 'BATCH-1',
          quantity_on_hand: 10,
          reorder_point: 5,
          folder_id: null,
          cost_price: 1,
          selling_price: 2,
        },
      ],
      count: 1,
      error: null,
    })

    mockFrom.mockReturnValue(query)

    const result = await fetchInventoryProducts({
      companyId: 'company-1',
      search: '',
      stockFilter: 'all',
      customFieldFilters: [{ key: 'batch', value: 'acme' }],
      page: 1,
      pageSize: 10,
      sortField: 'name',
      sortDir: 'asc',
    })

    expect(query.contains).toHaveBeenCalledWith('custom_fields', { batch: 'acme' })
    expect(result.products).toHaveLength(1)
  })

  it('builds org-scoped custom field options from existing product values', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'folders') {
        return {
          select: vi.fn(() => ({ eq: vi.fn(() => ({ order: vi.fn().mockResolvedValue({ data: [], error: null }) })) })),
        }
      }

      if (table === 'tags') {
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        }
      }

      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({
              data: [
                { custom_fields: { batch: 'acme', quality: 'A', active: true } },
                { custom_fields: { batch: 'acme', quality: 'B', active: false } },
                { custom_fields: { batch: 'beta', quality: '', ignored: null } },
              ],
              error: null,
            }),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await fetchInventoryFilters('company-1')

    expect(result.customFieldFilters).toEqual([
      { key: 'active', valueType: 'boolean', values: [false, true] },
      { key: 'batch', valueType: 'text', values: ['acme', 'beta'] },
      { key: 'quality', valueType: 'text', values: ['A', 'B'] },
    ])
  })

  it('fetches barcodes reference data', async () => {
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
    expect(result.barcodes).toHaveLength(1)
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

  it('moveInventoryProducts updates folder_id for the selected products', async () => {
    const inIds = vi.fn().mockResolvedValue({ error: null })
    const eqCompany = vi.fn(() => ({ in: inIds }))
    const update = vi.fn(() => ({ eq: eqCompany }))

    mockFrom.mockReturnValue({ update })

    const moved = await moveInventoryProducts('company-1', ['p-1', 'p-2'], 'folder-9')

    expect(moved).toBe(2)
    expect(mockFrom).toHaveBeenCalledWith('products')
    expect(update).toHaveBeenCalledWith({ folder_id: 'folder-9' })
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
    expect(inIds).toHaveBeenCalledWith('id', ['p-1', 'p-2'])
  })

  it('filters by folder_id IS NULL when folderId is __uncategorised__', async () => {
    const isCall = vi.fn()
    const query = makeProductsQuery({ data: [], count: 0, error: null })
    ;(query as Record<string, unknown>).is = vi.fn(() => query)
    isCall.mockImplementation(() => query)
    const origEq = query.eq
    ;(query as Record<string, unknown>).is = isCall

    mockFrom.mockReturnValue(query)

    await fetchInventoryProducts({
      companyId: 'company-1',
      search: '',
      folderId: '__uncategorised__',
      stockFilter: 'all',
      page: 1,
      pageSize: 10,
      sortField: 'name',
      sortDir: 'asc',
    })

    expect(isCall).toHaveBeenCalledWith('folder_id', null)
  })

  it('filters by folder_id eq when folderId is a regular id', async () => {
    const query = makeProductsQuery({ data: [], count: 0, error: null })
    mockFrom.mockReturnValue(query)

    await fetchInventoryProducts({
      companyId: 'company-1',
      search: '',
      folderId: 'folder-123',
      stockFilter: 'all',
      page: 1,
      pageSize: 10,
      sortField: 'name',
      sortDir: 'asc',
    })

    expect(query.eq).toHaveBeenCalledWith('folder_id', 'folder-123')
  })

  it('does not filter by folder when folderId is undefined', async () => {
    const isCall = vi.fn()
    const query = makeProductsQuery({ data: [], count: 0, error: null })
    ;(query as Record<string, unknown>).is = isCall
    mockFrom.mockReturnValue(query)

    await fetchInventoryProducts({
      companyId: 'company-1',
      search: '',
      stockFilter: 'all',
      page: 1,
      pageSize: 10,
      sortField: 'name',
      sortDir: 'asc',
    })

    // Should not call .is for folder_id
    expect(isCall).not.toHaveBeenCalled()
    // .eq should have been called for company_id but NOT for folder_id
    const folderEqCalls = query.eq.mock.calls.filter(
      (args: unknown[]) => args[0] === 'folder_id',
    )
    expect(folderEqCalls).toHaveLength(0)
  })

  it('fetchInventoryFilters does not require sort_order column', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table === 'folders') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({
                data: [
                  { id: 'f-1', name: 'Electronics', parent_id: null },
                  { id: 'f-2', name: 'Tools', parent_id: null },
                ],
                error: null,
              }),
            })),
          })),
        }
      }

      if (table === 'tags') {
        return {
          select: vi.fn(() => ({ eq: vi.fn().mockResolvedValue({ data: [], error: null }) })),
        }
      }

      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn().mockResolvedValue({ data: [], error: null }),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await fetchInventoryFilters('company-1')

    expect(result.folders).toHaveLength(2)
    expect(result.folders[0]?.name).toBe('Electronics')
    expect(result.folders[1]?.name).toBe('Tools')
  })

  it('createFolderInInventory inserts with correct fields', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ insert })

    await createFolderInInventory('company-1', 'New Folder', 'parent-1')

    expect(mockFrom).toHaveBeenCalledWith('folders')
    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      name: 'New Folder',
      parent_id: 'parent-1',
    })
  })

  it('renameFolderInInventory updates the folder name', async () => {
    const eqCompany = vi.fn().mockResolvedValue({ error: null })
    const eqId = vi.fn(() => ({ eq: eqCompany }))
    const update = vi.fn(() => ({ eq: eqId }))
    mockFrom.mockReturnValue({ update })

    await renameFolderInInventory('company-1', 'folder-1', 'Renamed Folder')

    expect(mockFrom).toHaveBeenCalledWith('folders')
    expect(update).toHaveBeenCalledWith({ name: 'Renamed Folder' })
    expect(eqId).toHaveBeenCalledWith('id', 'folder-1')
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })

  it('deleteFolderInInventory with move-uncategorised nullifies folder_id before deleting', async () => {
    const updateEqCompany = vi.fn().mockResolvedValue({ error: null })
    const updateIn = vi.fn(() => ({ then: (fn: (v: unknown) => unknown) => Promise.resolve({ error: null }).then(fn) }))
    const updateEqCompanyProducts = vi.fn(() => ({ in: vi.fn().mockResolvedValue({ error: null }) }))
    const updateEqCompanyForProducts = vi.fn(() => ({ in: vi.fn().mockResolvedValue({ error: null }) }))

    // Track calls to distinguish tables
    const calls: string[] = []
    mockFrom.mockImplementation((table: string) => {
      calls.push(table)
      if (table === 'folders') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        }
      }
      if (table === 'products') {
        return {
          update: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await deleteFolderInInventory('company-1', 'folder-1', 'move-uncategorised')

    // Should have queried folders for descendants, then products to move, then folders to delete
    expect(calls).toContain('folders')
    expect(calls).toContain('products')
  })

  it('deleteFolderInInventory with delete-products removes products before deleting folder', async () => {
    const calls: string[] = []
    mockFrom.mockImplementation((table: string) => {
      calls.push(table)
      if (table === 'folders') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        }
      }
      if (table === 'products') {
        return {
          delete: vi.fn(() => ({
            eq: vi.fn(() => ({
              in: vi.fn().mockResolvedValue({ error: null }),
            })),
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await deleteFolderInInventory('company-1', 'folder-1', 'delete-products')

    expect(calls).toContain('folders')
    expect(calls).toContain('products')
  })

  it('moveFolderInInventory updates parent_id and sort_order', async () => {
    const eqCompany = vi.fn().mockResolvedValue({ error: null })
    const eqId = vi.fn(() => ({ eq: eqCompany }))
    const update = vi.fn(() => ({ eq: eqId }))
    mockFrom.mockReturnValue({ update })

    await moveFolderInInventory('company-1', 'folder-1', 'new-parent', 3)

    expect(mockFrom).toHaveBeenCalledWith('folders')
    expect(update).toHaveBeenCalledWith({ parent_id: 'new-parent', sort_order: 3 })
    expect(eqId).toHaveBeenCalledWith('id', 'folder-1')
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })
})
