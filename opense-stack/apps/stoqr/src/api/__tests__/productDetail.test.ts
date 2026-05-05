import { beforeEach, describe, expect, it, vi } from 'vitest'

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

import { fetchProductBatchHistory } from '../productDetail'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('productDetail api', () => {
  it('fetches batch history from stoqr transactions and enriches performer names from profiles', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [
        {
          created_at: '2026-05-01T10:00:00.000Z',
          quantity_change: -6,
          notes: 'LOT-0008 released to customer order',
          performed_by: 'user-1',
        },
        {
          created_at: '2026-05-02T12:00:00.000Z',
          quantity_change: -2,
          notes: null,
          performed_by: null,
        },
      ],
      error: null,
    })

    const eqTransactionType = vi.fn(() => ({ order }))
    const eqProductId = vi.fn(() => ({ eq: eqTransactionType }))
    const eqCompanyId = vi.fn(() => ({ eq: eqProductId }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'inventory_transactions') {
        return {
          select: vi.fn(() => ({ eq: eqCompanyId })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const inProfiles = vi.fn().mockResolvedValue({
      data: [{ id: 'user-1', full_name: 'Alex Morgan', username: 'alex' }],
      error: null,
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({ in: inProfiles })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const rows = await fetchProductBatchHistory('company-1', 'product-1')

    expect(eqCompanyId).toHaveBeenCalledWith('company_id', 'company-1')
    expect(eqProductId).toHaveBeenCalledWith('product_id', 'product-1')
    expect(eqTransactionType).toHaveBeenCalledWith('transaction_type', 'sale')
    expect(inProfiles).toHaveBeenCalledWith('id', ['user-1'])
    expect(rows).toEqual([
      {
        created_at: '2026-05-01T10:00:00.000Z',
        quantity_change: -6,
        notes: 'LOT-0008 released to customer order',
        profiles: { full_name: 'Alex Morgan' },
      },
      {
        created_at: '2026-05-02T12:00:00.000Z',
        quantity_change: -2,
        notes: null,
        profiles: null,
      },
    ])
  })
})