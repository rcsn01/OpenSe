import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()

vi.mock('../../supabaseClient', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { fetchDashboardData } from '../dashboard'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('dashboard api', () => {
  it('maps RPC payloads into dashboard model including new KPI fields', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: {
          kpis: {
            total_inventory_value: '1250',
            total_stock_units: '42',
            low_stock_items: '3',
            out_of_stock_items: '1',
            pending_orders: '4',
          },
          alerts_summary: {
            open_alerts: '8',
            critical_alerts: '2',
            low_stock_alerts: '3',
            reorder_alerts: '2',
            expiration_alerts: '1',
          },
          charts: {
            inventory_trend: [
              { day: '2026-02-20', delta: '100' },
              { day: '2026-02-21', delta: '150' },
            ],
            usage_trend: [
              { day: '2026-02-20', usage: '10' },
              { day: '2026-02-21', usage: '12' },
            ],
          },
        },
        error: null,
      })
      .mockResolvedValueOnce({
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
      .mockResolvedValueOnce({
        data: [
          {
            transaction_id: 't-0',
            created_at: '2026-02-20T00:00:00Z',
            transaction_type: 'purchase',
            quantity_change: '5',
            product_id: 'p-1',
            sku: 'SKU-1',
            product_name: 'Product 1',
            performer_name: 'Warehouse Team',
          },
          {
            transaction_id: 't-1',
            created_at: '2026-02-21T00:00:00Z',
            transaction_type: 'sale',
            quantity_change: '-2',
            product_id: 'p-1',
            sku: 'SKU-1',
            product_name: 'Product 1',
            performer_name: 'Alice',
          },
          {
            transaction_id: 't-2',
            created_at: '2026-02-22T00:00:00Z',
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

    const data = await fetchDashboardData('company-1')

    expect(data.totalValue).toBe(1250)
    expect(data.totalStockUnits).toBe(42)
    expect(data.lowStockCount).toBe(3)
    expect(data.pendingOrders).toBe(4)
    expect(data.alertsSummary.criticalAlerts).toBe(2)
    expect(data.usageChartData).toEqual([
      { date: '2026-02-20', value: 10 },
      { date: '2026-02-21', value: 12 },
    ])
    expect(data.movementChartData).toEqual([
      { date: '2026-02-20', inbound: 5, outbound: 0 },
      { date: '2026-02-21', inbound: 0, outbound: 2 },
      { date: '2026-02-22', inbound: 0, outbound: 1 },
    ])
    expect(data.revenue30Days).toBe(90)
    expect(data.topMovers[0]).toMatchObject({ id: 'p-1', totalSold: 3, revenue: 90 })

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'get_stoqr_dashboard_snapshot', expect.objectContaining({
      target_company_id: 'company-1',
    }))
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'get_stoqr_report_inventory_valuation', {
      target_company_id: 'company-1',
    })
    expect(mockRpc).toHaveBeenNthCalledWith(3, 'get_stoqr_report_stock_movements', expect.objectContaining({
      target_company_id: 'company-1',
    }))
  })

  it('throws if snapshot RPC fails', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: null,
        error: { message: 'snapshot failed' },
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [],
        error: null,
      })

    await expect(fetchDashboardData('company-1')).rejects.toMatchObject({ message: 'snapshot failed' })
  })
})
