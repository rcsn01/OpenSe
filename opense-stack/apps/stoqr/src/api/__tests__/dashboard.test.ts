import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
}))

import { fetchDashboardData } from '../dashboard'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dashboard api', () => {
  it('maps direct view payloads into dashboard model including KPI fields', async () => {
    const formatDay = (offset: number) => {
      const date = new Date()
      date.setDate(date.getDate() + offset)
      return date.toISOString().slice(0, 10)
    }
    const dayOne = formatDay(-2)
    const dayTwo = formatDay(-1)
    const dayThree = formatDay(0)

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'report_inventory_valuation') {
        const order = vi.fn().mockResolvedValue({
          data: [
            {
              product_id: 'p-1',
              sku: 'SKU-1',
              name: 'Product 1',
              quantity_on_hand: '10',
              reorder_point: '5',
              cost_price: '20',
              selling_price: '30',
            },
          ],
          error: null,
        })
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order })),
          })),
        }
      }

      if (table === 'report_stock_movements') {
        const order = vi.fn().mockResolvedValue({
          data: [
            {
              transaction_id: 't-0',
              created_at: `${dayOne}T00:00:00Z`,
              transaction_type: 'purchase',
              quantity_change: '5',
              product_id: 'p-1',
              sku: 'SKU-1',
              product_name: 'Product 1',
              performer_name: 'Warehouse Team',
            },
            {
              transaction_id: 't-1',
              created_at: `${dayTwo}T00:00:00Z`,
              transaction_type: 'sale',
              quantity_change: '-2',
              product_id: 'p-1',
              sku: 'SKU-1',
              product_name: 'Product 1',
              performer_name: 'Alice',
            },
            {
              transaction_id: 't-2',
              created_at: `${dayThree}T00:00:00Z`,
              transaction_type: 'scan_out',
              quantity_change: '-1',
              product_id: 'p-1',
              sku: 'SKU-1',
              product_name: 'Product 1',
              performer_name: 'Bob',
            },
          ],
          error: null,
        })
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              gte: vi.fn(() => ({
                lte: vi.fn(() => ({ order })),
              })),
            })),
          })),
        }
      }

      if (table === 'purchase_orders') {
        const inFilter = vi.fn().mockResolvedValue({ count: 4, error: null })
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ in: inFilter })),
          })),
        }
      }

      if (table === 'alert_events') {
        const statusEq = vi.fn().mockResolvedValue({
          data: [
            { alert_type: 'low_stock', severity: 'critical', status: 'open' },
            { alert_type: 'low_stock', severity: 'high', status: 'open' },
            { alert_type: 'reorder_point', severity: 'medium', status: 'open' },
            { alert_type: 'expiration', severity: 'critical', status: 'open' },
          ],
          error: null,
        })
        const companyEq = vi.fn(() => ({ eq: statusEq }))
        return {
          select: vi.fn(() => ({ eq: companyEq })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const data = await fetchDashboardData('company-1')

    expect(data.totalValue).toBe(200)
    expect(data.totalStockUnits).toBe(10)
    expect(data.lowStockCount).toBe(0)
    expect(data.pendingOrders).toBe(4)
    expect(data.alertsSummary.criticalAlerts).toBe(2)
    expect(data.usageChartData.reduce((sum, point) => sum + point.value, 0)).toBe(3)
    expect(data.movementChartData).toEqual([
      { date: dayOne, inbound: 5, outbound: 0 },
      { date: dayTwo, inbound: 0, outbound: 2 },
      { date: dayThree, inbound: 0, outbound: 1 },
    ])
    expect(data.revenue30Days).toBe(90)
    expect(data.topMovers[0]).toMatchObject({ id: 'p-1', totalSold: 3, revenue: 90 })

    expect(mockDbFrom).toHaveBeenCalledWith('report_inventory_valuation')
    expect(mockDbFrom).toHaveBeenCalledWith('report_stock_movements')
    expect(mockDbFrom).toHaveBeenCalledWith('purchase_orders')
    expect(mockDbFrom).toHaveBeenCalledWith('alert_events')
  })

  it('throws if valuation view fails', async () => {
    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'report_inventory_valuation') {
        const order = vi.fn().mockResolvedValue({
          data: null,
          error: { message: 'valuation failed' },
        })
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order })),
          })),
        }
      }

      const resolved = Promise.resolve({ data: [], count: 0, error: null })
      const query = {
        eq: vi.fn(() => query),
        gte: vi.fn(() => query),
        lte: vi.fn(() => query),
        in: vi.fn(() => resolved),
        order: vi.fn(() => resolved),
        then: (resolve: (value: { data: never[]; count: number; error: null }) => unknown) =>
          resolved.then(resolve),
      }
      return {
        select: vi.fn(() => query),
      }
    })

    await expect(fetchDashboardData('company-1')).rejects.toMatchObject({ message: 'valuation failed' })
  })
})
