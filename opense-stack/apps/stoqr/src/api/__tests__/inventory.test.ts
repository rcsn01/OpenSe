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
  it('throws when fetchInventoryStats view returns an error', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Stats failed' },
          }),
        })),
      })),
    })

    await expect(fetchInventoryStats('company-1')).rejects.toMatchObject({ message: 'Stats failed' })
    expect(mockFrom).toHaveBeenCalledWith('inventory_stats')
  })

  it('maps inventory stats from the view', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: { total_items: '2', low_stock_items: '1', total_value: '42.5' },
            error: null,
          }),
        })),
      })),
    })

    await expect(fetchInventoryStats('company-1')).resolves.toEqual({
      totalItems: 2,
      lowStockItems: 1,
      totalValue: 42.5,
    })
  })

  it('returns empty stats when the view has no row', async () => {
    mockFrom.mockReturnValue({
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          maybeSingle: vi.fn().mockResolvedValue({
            data: null,
            error: null,
          }),
        })),
      })),
    })

    await expect(fetchInventoryStats('company-1')).resolves.toEqual({
      totalItems: 0,
      lowStockItems: 0,
      totalValue: 0,
    })
  })

  it('returns 0 and avoids insert when import rows are empty/invalid', async () => {
    const inserted = await importInventoryProducts('company-1', {
      rows: [
        { name: '', sku: '' },
        { Name: 'No SKU' },
        { SKU: 'NO-NAME' },
      ],
      folderId: 'folder-1',
      columnMappings: {
        name: 'name',
        sku: 'sku',
        description: null,
        cost_price: null,
        selling_price: null,
        quantity_on_hand: null,
        reorder_point: null,
      },
      attributeColumns: [],
    })

    expect(inserted).toEqual({
      importedCount: 0,
      duplicateCount: 0,
      invalidCount: 3,
      duplicateSkus: [],
    })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('imports mapped fields, assigns folder, and skips duplicate skus', async () => {
    const existingIn = vi.fn().mockResolvedValue({
      data: [{ sku: 'SKU-2' }],
      error: null,
    })
    const existingEq = vi.fn(() => ({ in: existingIn }))
    const existingSelect = vi.fn(() => ({ eq: existingEq }))
    const insert = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: existingSelect,
          insert,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await importInventoryProducts('company-1', {
      rows: [
        {
          Product: 'Widget',
          SKU: 'SKU-1',
          Description: 'Main widget',
          Cost: '12.50',
          Price: '21.99',
          Stock: '8',
          Alert: '3',
          Color: 'Blue',
        },
        {
          Product: 'Existing widget',
          SKU: 'SKU-2',
          Description: 'Duplicate in db',
          Cost: '4',
          Price: '9',
          Stock: '5',
          Alert: '2',
          Color: 'Green',
        },
        {
          Product: 'Repeated widget',
          SKU: 'SKU-1',
          Description: 'Duplicate in csv',
          Cost: '4',
          Price: '9',
          Stock: '5',
          Alert: '2',
          Color: 'Green',
        },
      ],
      folderId: 'folder-9',
      columnMappings: {
        name: 'Product',
        sku: 'SKU',
        description: 'Description',
        cost_price: 'Cost',
        selling_price: 'Price',
        quantity_on_hand: 'Stock',
        reorder_point: 'Alert',
      },
      attributeColumns: ['Color'],
    })

    expect(existingEq).toHaveBeenCalledWith('company_id', 'company-1')
    expect(existingIn).toHaveBeenCalledWith('sku', ['SKU-1', 'SKU-2'])
    expect(insert).toHaveBeenCalledWith([
      {
        company_id: 'company-1',
        folder_id: 'folder-9',
        name: 'Widget',
        sku: 'SKU-1',
        description: 'Main widget',
        quantity_on_hand: 8,
        reorder_point: 3,
        cost_price: 12.5,
        selling_price: 21.99,
        custom_fields: { Color: 'Blue' },
      },
    ])
    expect(result).toEqual({
      importedCount: 1,
      duplicateCount: 2,
      invalidCount: 0,
      duplicateSkus: ['SKU-1', 'SKU-2'],
    })
  })

  it('imports rows without sku values while still deduplicating provided skus', async () => {
    const existingIn = vi.fn().mockResolvedValue({
      data: [{ sku: 'SKU-2' }],
      error: null,
    })
    const existingEq = vi.fn(() => ({ in: existingIn }))
    const existingSelect = vi.fn(() => ({ eq: existingEq }))
    const insert = vi.fn().mockResolvedValue({ error: null })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: existingSelect,
          insert,
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await importInventoryProducts('company-1', {
      rows: [
        { Product: 'Nameless SKU', Description: 'No sku row' },
        { Product: 'Has sku', SKU: 'SKU-2' },
        { Product: 'Has unique sku', SKU: 'SKU-3' },
      ],
      folderId: null,
      columnMappings: {
        name: 'Product',
        sku: 'SKU',
        description: 'Description',
        cost_price: null,
        selling_price: null,
        quantity_on_hand: null,
        reorder_point: null,
      },
      attributeColumns: [],
    })

    expect(existingIn).toHaveBeenCalledWith('sku', ['SKU-2', 'SKU-3'])
    expect(insert).toHaveBeenCalledWith([
      {
        company_id: 'company-1',
        folder_id: null,
        name: 'Nameless SKU',
        sku: null,
        description: 'No sku row',
        quantity_on_hand: 0,
        reorder_point: 10,
        cost_price: 0,
        selling_price: 0,
        custom_fields: {},
      },
      {
        company_id: 'company-1',
        folder_id: null,
        name: 'Has unique sku',
        sku: 'SKU-3',
        description: null,
        quantity_on_hand: 0,
        reorder_point: 10,
        cost_price: 0,
        selling_price: 0,
        custom_fields: {},
      },
    ])
    expect(result).toEqual({
      importedCount: 2,
      duplicateCount: 1,
      invalidCount: 0,
      duplicateSkus: ['SKU-2'],
    })
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
