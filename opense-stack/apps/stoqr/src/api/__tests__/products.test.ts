import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockStorageFrom = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    storage: {
      from: (...args: unknown[]) => mockStorageFrom(...args),
    },
  },
}))

import { createProduct, fetchProductDetail } from '../products'

beforeEach(() => {
  vi.clearAllMocks()
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
        category: '',
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
      category: null,
      quantity_on_hand: 7,
      reorder_point: 3,
      cost_price: 10.5,
      selling_price: 15.25,
      folder_id: null,
      expiry_date: null,
      custom_fields: { quality: 'A' },
    })
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
        category: 'cat',
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

  it('returns null product on not-found and normalizes transaction profiles', async () => {
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
          profiles: [{ id: 'u-1', full_name: 'Alice', username: 'alice' }],
        },
      ],
      error: null,
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
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

  it('throws when transactions query fails', async () => {
    const productSingle = vi.fn().mockResolvedValue({
      data: { id: 'prod-4', name: 'Widget' },
      error: null,
    })

    const transactionOrder = vi.fn().mockResolvedValue({
      data: null,
      error: { message: 'transactions failed' },
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
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

    await expect(fetchProductDetail('company-1', 'prod-4')).rejects.toMatchObject({
      message: 'transactions failed',
    })
  })
})
