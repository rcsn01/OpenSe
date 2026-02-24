import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()
const mockSupabaseRpc = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
  supabase: {
    rpc: (...args: unknown[]) => mockSupabaseRpc(...args),
  },
}))

import {
  createAlertRule,
  fetchAlertDeliveryLogs,
  fetchAlertEvents,
  fetchAlertProducts,
  fetchAlertRules,
  updateAlertEventStatus,
  updateAlertRuleEnabled,
} from '../alerts'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('alerts api', () => {
  it('fetches alert products from RPC', async () => {
    mockSupabaseRpc.mockResolvedValue({
      data: [{ id: 'p-1', name: 'Milk', sku: 'MLK', quantity_on_hand: 1, reorder_point: 2, expiry_date: null }],
      error: null,
    })

    const rows = await fetchAlertProducts('company-1')

    expect(rows).toHaveLength(1)
    expect(mockSupabaseRpc).toHaveBeenCalledWith('get_stoqr_alert_products', { target_company_id: 'company-1' })
  })

  it('creates and toggles alert rules', async () => {
    const insert = vi.fn().mockResolvedValue({ error: null })
    const eqCompany = vi.fn().mockResolvedValue({ error: null })
    const eqRule = vi.fn(() => ({ eq: eqCompany }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'alert_rules') {
        return {
          insert,
          update: vi.fn(() => ({ eq: eqRule })),
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn().mockResolvedValue({ data: [], error: null }),
            })),
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await createAlertRule('company-1', {
      name: 'Rule 1',
      alertType: 'custom',
      condition: { threshold: 5 },
      deliveryChannels: ['in_app', 'email'],
      recipients: ['ops@example.com'],
    })

    await updateAlertRuleEnabled('company-1', 'rule-1', false)

    expect(insert).toHaveBeenCalledWith(expect.objectContaining({
      company_id: 'company-1',
      name: 'Rule 1',
      alert_type: 'custom',
      enabled: true,
    }))
    expect(eqRule).toHaveBeenCalledWith('id', 'rule-1')
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })

  it('fetches alert rules, events and delivery logs', async () => {
    const rulesOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'r-1',
          company_id: 'company-1',
          name: 'Expiry Rule',
          alert_type: 'expiration',
          enabled: true,
          condition: {},
          delivery_channels: ['in_app'],
          recipients: [],
          created_at: '2026-02-24T00:00:00Z',
        },
      ],
      error: null,
    })

    const eventsLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'e-1',
          company_id: 'company-1',
          rule_id: 'r-1',
          product_id: 'p-1',
          alert_type: 'expiration',
          severity: 'high',
          status: 'open',
          message: 'Expiry soon',
          triggered_at: '2026-02-24T00:00:00Z',
          products: { name: 'Milk', sku: 'MLK' },
        },
      ],
      error: null,
    })

    const deliveryLimit = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'd-1',
          alert_event_id: 'e-1',
          channel: 'email',
          recipient: 'ops@example.com',
          status: 'sent',
          sent_at: '2026-02-24T01:00:00Z',
          error_message: null,
          alert_events: { message: 'Expiry soon', alert_type: 'expiration', severity: 'high', triggered_at: '2026-02-24T00:00:00Z' },
        },
      ],
      error: null,
    })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'alert_rules') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order: rulesOrder })),
          })),
        }
      }

      if (table === 'alert_events') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ limit: eventsLimit })),
            })),
          })),
        }
      }

      if (table === 'alert_delivery_logs') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              order: vi.fn(() => ({ limit: deliveryLimit })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const [rules, events, deliveries] = await Promise.all([
      fetchAlertRules('company-1'),
      fetchAlertEvents('company-1'),
      fetchAlertDeliveryLogs('company-1'),
    ])

    expect(rules).toHaveLength(1)
    expect(events).toHaveLength(1)
    expect(deliveries).toHaveLength(1)
    expect(events[0].products?.sku).toBe('MLK')
    expect(deliveries[0].alert_events?.alert_type).toBe('expiration')
  })

  it('updates alert event status scoped by company', async () => {
    const eqCompany = vi.fn().mockResolvedValue({ error: null })
    const eqEvent = vi.fn(() => ({ eq: eqCompany }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'alert_events') {
        return {
          update: vi.fn(() => ({ eq: eqEvent })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await updateAlertEventStatus('company-1', 'event-1', 'acknowledged')
    await updateAlertEventStatus('company-1', 'event-1', 'resolved')

    expect(eqEvent).toHaveBeenCalledWith('id', 'event-1')
    expect(eqCompany).toHaveBeenCalledWith('company_id', 'company-1')
  })
})
