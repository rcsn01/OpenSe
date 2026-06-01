import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockSupabaseGetUser = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockSupabaseGetUser(...args),
    },
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}))

import { createProduct, fetchProductDetail, transferProductStock, updateProduct } from '../products'

beforeEach(() => {
  vi.clearAllMocks()
  mockSupabaseGetUser.mockResolvedValue({
    data: { user: { id: 'user-1' } },
    error: null,
  })
})

afterEach(() => {
  vi.restoreAllMocks()
})

describe('products api', () => {
  it('creates product with normalized fields and returns new id', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'prod-1' }, error: null })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return { insert }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await createProduct(
      'company-1',
      {
        name: 'Widget',
        sku: 'W-001',
        description: '',
        quantity: '7',
        reorderPoint: '3',
        costPrice: '10.5',
        sellingPrice: '15.25',
        folderId: '',
        expiryDate: '',
        customFields: { quality: 'A' },
      },
      [],
    )

    expect(result).toEqual({ id: 'prod-1' })
    expect(insert).toHaveBeenCalledWith({
      company_id: 'company-1',
      name: 'Widget',
      sku: 'W-001',
      description: null,
      quantity_on_hand: 7,
      reorder_point: 3,
      cost_price: 10.5,
      selling_price: 15.25,
      folder_id: null,
      expiry_date: null,
      custom_fields: { quality: 'A' },
    })
  })

  it('stores null sku when the product is created without one', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'prod-null-sku' }, error: null })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return { insert }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await createProduct(
      'company-1',
      {
        name: 'Widget without sku',
        sku: '   ',
        description: '',
        quantity: '0',
        reorderPoint: '1',
        costPrice: '',
        sellingPrice: '',
        folderId: '',
        expiryDate: '',
        customFields: {},
      },
      [],
    )

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      sku: null,
    }))
  })

  it('uploads product images and stores uploaded paths', async () => {
    const single = vi.fn().mockResolvedValue({ data: { id: 'prod-2' }, error: null })
    const insert = vi.fn(() => ({ select: vi.fn(() => ({ single })) }))
    const eq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return { insert, update }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const upload = vi
      .fn()
      .mockResolvedValueOnce({ error: null })
      .mockResolvedValueOnce({ error: { message: 'upload failed' } })
    mockStorageFrom.mockReturnValue({ upload })

    vi.spyOn(Date, 'now').mockReturnValue(1700000000000)

    const files = [
      { name: 'front image.png' } as unknown as File,
      { name: 'bad image.png' } as unknown as File,
    ]

    const result = await createProduct(
      'company-1',
      {
        name: 'Widget',
        sku: 'W-002',
        description: 'desc',
        quantity: '1',
        reorderPoint: '1',
        costPrice: '1',
        sellingPrice: '2',
        folderId: 'folder-1',
        expiryDate: '2026-12-31',
        customFields: {},
      },
      files,
    )

    expect(result).toEqual({ id: 'prod-2' })
    expect(mockStorageFrom).toHaveBeenCalledWith('product-images')
    expect(upload).toHaveBeenCalledTimes(2)

    expect(update).toHaveBeenCalledWith({
      image_urls: ['company-1/prod-2/1700000000000_front_image.png'],
    })
    expect(eq).toHaveBeenCalledWith('id', 'prod-2')
  })

  it('returns null product on not-found and enriches transaction profiles', async () => {
    const productSingle = vi
      .fn()
      .mockResolvedValueOnce({ data: null, error: { code: 'PGRST116' } })
      .mockResolvedValueOnce({
        data: {
          id: 'prod-3',
          name: 'Widget',
        },
        error: null,
      })

    const transactionOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'tx-1',
          transaction_type: 'adjustment',
          quantity_change: 2,
          stock_after: 4,
          created_at: '2026-02-19T12:00:00.000Z',
          notes: null,
          performed_by: 'u-1',
        },
      ],
      error: null,
    })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: productSingle })),
            })),
          })),
        }
      }

      if (table === 'inventory_transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: transactionOrder,
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'u-1', full_name: 'Alice', username: 'alice' }],
              error: null,
            }),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const notFound = await fetchProductDetail('company-1', 'missing-prod')
    expect(notFound).toEqual({ product: null, transactions: [] })

    const found = await fetchProductDetail('company-1', 'prod-3')
    expect(found.product).toEqual({ id: 'prod-3', name: 'Widget' })
    expect(found.transactions[0]?.profiles).toEqual({
      id: 'u-1',
      full_name: 'Alice',
      username: 'alice',
    })
  })

  it('returns product with empty transactions when transactions query fails', async () => {
    const productSingle = vi.fn().mockResolvedValue({
      data: { id: 'prod-4', name: 'Widget' },
      error: null,
    })

    const transactionOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'transactions failed' },
    })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: productSingle })),
            })),
          })),
        }
      }

      if (table === 'inventory_transactions') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({
                order: transactionOrder,
              })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await fetchProductDetail('company-1', 'prod-4')
    expect(result).toEqual({
      product: { id: 'prod-4', name: 'Widget' },
      transactions: [],
    })
  })

  it('updates product fields and merges retained plus newly uploaded images', async () => {
    const firstEqId = vi.fn().mockResolvedValue({ error: null })
    const firstEqCompany = vi.fn(() => ({ eq: firstEqId }))
    const secondEqId = vi.fn().mockResolvedValue({ error: null })
    const secondEqCompany = vi.fn(() => ({ eq: secondEqId }))

    const update = vi
      .fn()
      .mockReturnValueOnce({ eq: firstEqCompany })
      .mockReturnValueOnce({ eq: secondEqCompany })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return { update }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    vi.spyOn(Date, 'now').mockReturnValue(1700000000123)

    const upload = vi.fn().mockResolvedValue({ error: null })
    mockStorageFrom.mockReturnValue({ upload })

    const result = await updateProduct(
      'company-1',
      'prod-9',
      {
        name: 'Updated Widget',
        sku: 'W-009',
        description: '',
        quantity: '12',
        reorderPoint: '4',
        costPrice: '11.5',
        sellingPrice: '18',
        folderId: '',
        expiryDate: '',
        customFields: { quality: 'A' },
      },
      [{ name: 'new image.png' } as unknown as File],
      ['company-1/prod-9/existing.png'],
    )

    expect(result).toEqual({ id: 'prod-9' })
    expect(update).toHaveBeenNthCalledWith(1, {
      name: 'Updated Widget',
      sku: 'W-009',
      description: null,
      quantity_on_hand: 12,
      reorder_point: 4,
      cost_price: 11.5,
      selling_price: 18,
      folder_id: null,
      expiry_date: null,
      custom_fields: { quality: 'A' },
    })
    expect(update).toHaveBeenNthCalledWith(2, {
      image_urls: ['company-1/prod-9/existing.png', 'company-1/prod-9/1700000000123_new_image.png'],
    })
    expect(upload).toHaveBeenCalledWith('company-1/prod-9/1700000000123_new_image.png', expect.anything())
  })

  it('clears sku when an updated product removes it', async () => {
    const firstEqId = vi.fn().mockResolvedValue({ error: null })
    const firstEqCompany = vi.fn(() => ({ eq: firstEqId }))
    const secondEqId = vi.fn().mockResolvedValue({ error: null })
    const secondEqCompany = vi.fn(() => ({ eq: secondEqId }))

    const update = vi
      .fn()
      .mockReturnValueOnce({ eq: firstEqCompany })
      .mockReturnValueOnce({ eq: secondEqCompany })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'products') {
        return { update }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    mockStorageFrom.mockReturnValue({ upload: vi.fn().mockResolvedValue({ error: null }) })

    await updateProduct(
      'company-1',
      'prod-10',
      {
        name: 'Updated Widget',
        sku: '',
        description: '',
        quantity: '12',
        reorderPoint: '4',
        costPrice: '11.5',
        sellingPrice: '18',
        folderId: '',
        expiryDate: '',
        customFields: {},
      },
      [],
      [],
    )

    expect(update).toHaveBeenNthCalledWith(1, expect.objectContaining({
      sku: null,
    }))
  })

  it('transfers product stock through direct inventory transactions with normalized notes', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        return { insert }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')

    const result = await transferProductStock({
      companyId: 'company-1',
      productId: 'prod-1',
      fromFolderId: 'folder-1',
      toFolderId: 'folder-2',
      quantity: 3,
      notes: '  Move to front shelf  ',
    })

    expect(result).toBe('11111111-1111-4111-8111-111111111111')
    expect(mockSupabaseGetUser).toHaveBeenCalled()
    expect(insert).toHaveBeenCalledWith([
      {
        company_id: 'company-1',
        product_id: 'prod-1',
        folder_id: 'folder-1',
        performed_by: 'user-1',
        transaction_type: 'transfer_out',
        source: 'manual',
        quantity_change: -3,
        transfer_group_id: '11111111-1111-4111-8111-111111111111',
        notes: 'Move to front shelf',
      },
      {
        company_id: 'company-1',
        product_id: 'prod-1',
        folder_id: 'folder-2',
        performed_by: 'user-1',
        transaction_type: 'transfer_in',
        source: 'manual',
        quantity_change: 3,
        transfer_group_id: '11111111-1111-4111-8111-111111111111',
        notes: 'Move to front shelf',
      },
    ])
  })

  it('sends null notes and throws stock transfer write errors', async () => {
    const rpcError = { message: 'Insufficient stock' }
    const insert = vi.fn().mockResolvedValue({ error: rpcError })
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        return { insert }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    vi.spyOn(crypto, 'randomUUID').mockReturnValue('11111111-1111-4111-8111-111111111111')

    await expect(transferProductStock({
      companyId: 'company-1',
      productId: 'prod-1',
      fromFolderId: 'folder-1',
      toFolderId: 'folder-2',
      quantity: 99,
      notes: '   ',
    })).rejects.toEqual(rpcError)
    expect(insert).toHaveBeenCalledWith(expect.arrayContaining([
      expect.objectContaining({ notes: null }),
    ]))
  })
})
