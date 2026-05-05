import { useMemo, useState } from 'react'
import { ArrowDownRight, ArrowUpRight } from 'lucide-react'
import type { DashboardData } from '../api/dashboard'
import type { AlertEvent } from '../api/alerts'
import type { PurchaseOrder, PurchaseOrderItem } from '../api/procurement'
import { BasePage } from '../components/BasePage'
import { useCompany } from '../contexts/CompanyContext'
import { useAlertEvents } from '../hooks/queries/useAlerts'
import { useDashboard } from '../hooks/queries/useDashboard'
import {
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
} from '../hooks/queries/useProcurementTabs'
import './DashboardPage.css'

type VelocityTabId = 'fast' | 'slow' | 'dead'
type TrendDirection = 'up' | 'down' | 'neutral'
type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low'
type MetricTone = 'positive' | 'warning' | 'danger' | 'neutral'
type DeliveryStatusTone = 'on-time' | 'delayed' | 'pending'
type VelocityTone = 'high' | 'medium' | 'low'

type DashboardMetric = {
  label: string
  value: string
  accentLabel: string
  detail: string
  tone: MetricTone
  direction: TrendDirection
}

type AttentionItem = {
  id: string
  severity: AttentionSeverity
  title: string
  detail: string
  timeLabel: string
  sortValue: number
}

type DeliveryRow = {
  id: string
  poLabel: string
  vendor: string
  itemsCountLabel: string
  valueLabel: string
  expectedLabel: string
  statusLabel: string
  statusTone: DeliveryStatusTone
  sortValue: number
}

type VelocityItem = {
  id: string
  name: string
  sku: string
  metricLabel: string
  statusLabel: string
  statusTone: VelocityTone
}

const velocityTabs: Array<{ id: VelocityTabId; label: string }> = [
  { id: 'fast', label: 'Fast' },
  { id: 'slow', label: 'Slow' },
  { id: 'dead', label: 'Dead Stock' },
]

const attentionPriority: Record<AttentionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)

const formatCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)

const formatInteger = (value: number) =>
  new Intl.NumberFormat('en-US', {
    maximumFractionDigits: 0,
  }).format(value)

const formatShortDate = (value: string | null) => {
  if (!value) return 'TBD'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
}

const formatRelativeTimestamp = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime()
  const diffMinutes = Math.round(diffMs / (60 * 1000))
  const diffHours = Math.round(diffMs / (60 * 60 * 1000))
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (diffMinutes <= 0) return 'just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

const getDaysFromToday = (value: string) => {
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const target = new Date(value)
  target.setHours(0, 0, 0, 0)

  return Math.round((target.getTime() - today.getTime()) / (24 * 60 * 60 * 1000))
}

const formatExpectedDate = (value: string | null) => {
  if (!value) return 'TBD'

  const dayDelta = getDaysFromToday(value)
  if (dayDelta === 0) return 'Today'
  if (dayDelta === 1) return 'Tomorrow'
  if (dayDelta > 1 && dayDelta <= 6) return `In ${dayDelta} days`
  if (dayDelta === -1) return '1 day overdue'
  if (dayDelta < -1) return `${Math.abs(dayDelta)} days overdue`

  return formatShortDate(value)
}

const formatTrendPercent = (
  values: number[],
  lowerIsBetter = false,
): { text: string; direction: TrendDirection } => {
  if (values.length < 2) {
    return { text: 'Stable', direction: 'neutral' as TrendDirection }
  }

  const first = values[0] ?? 0
  const last = values[values.length - 1] ?? 0
  if (first === 0 && last === 0) {
    return { text: 'Stable', direction: 'neutral' as TrendDirection }
  }

  if (first === 0) {
    const direction: TrendDirection = lowerIsBetter ? 'down' : 'up'
    return {
      text: `${direction === 'up' ? '+' : '-'}${formatInteger(Math.abs(last))}`,
      direction,
    }
  }

  const percent = ((last - first) / Math.abs(first)) * 100
  if (Math.abs(percent) < 0.5) {
    return { text: 'Stable', direction: 'neutral' as TrendDirection }
  }

  const rawDirection = percent > 0 ? 'up' : 'down'
  return {
    text: `${percent > 0 ? '+' : ''}${percent.toFixed(Math.abs(percent) >= 10 ? 0 : 1)}%`,
    direction: lowerIsBetter ? (rawDirection === 'up' ? 'down' : 'up') : rawDirection,
  }
}

const formatDayLabel = (value: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(value))

const padPurchaseOrder = (value: number) => `PO-${String(value).padStart(4, '0')}`

const classifyVelocityTone = (value: number): VelocityTone => {
  if (value >= 100) return 'high'
  if (value >= 40) return 'medium'
  return 'low'
}

const buildMovementChartWindow = (data: DashboardData['movementChartData']) => {
  const sorted = data
    .slice()
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-7)

  return sorted.map((point) => ({
    ...point,
    label: formatDayLabel(point.date),
  }))
}

const buildAttentionItems = (
  alertEvents: AlertEvent[],
  purchaseOrders: PurchaseOrder[],
  data: DashboardData,
) => {
  const alertRows: AttentionItem[] = alertEvents
    .filter((event) => event.status !== 'resolved')
    .map((event) => ({
      id: `alert-${event.id}`,
      severity: event.severity,
      title: event.message,
      detail: event.products?.sku
        ? `${event.products.sku} · ${event.products.name ?? 'Inventory item'}`
        : 'System alert',
      timeLabel: formatRelativeTimestamp(event.triggered_at),
      sortValue: new Date(event.triggered_at).getTime(),
    }))

  const delayedShipments: AttentionItem[] = purchaseOrders
    .filter(
      (order) =>
        !!order.expected_date &&
        order.status !== 'closed' &&
        order.status !== 'cancelled' &&
        getDaysFromToday(order.expected_date) < 0,
    )
    .map((order) => {
      const overdueDays = Math.abs(getDaysFromToday(order.expected_date as string))
      return {
        id: `po-${order.id}`,
        severity: overdueDays > 2 ? 'high' : 'medium',
        title: `Shipment ${padPurchaseOrder(order.po_number)} delayed by ${overdueDays} day${overdueDays === 1 ? '' : 's'}`,
        detail: `Vendor: ${order.suppliers?.name ?? 'Unassigned supplier'}`,
        timeLabel: formatRelativeTimestamp(order.expected_date as string),
        sortValue: new Date(order.expected_date as string).getTime(),
      }
    })

  const combined = [...delayedShipments, ...alertRows]
    .sort((left, right) => {
      const severityDelta = attentionPriority[right.severity] - attentionPriority[left.severity]
      if (severityDelta !== 0) return severityDelta
      return right.sortValue - left.sortValue
    })
    .slice(0, 6)

  if (combined.length > 0) {
    return combined
  }

  return data.products
    .filter((product) => product.quantity_on_hand <= product.reorder_point)
    .slice(0, 6)
    .map((product) => ({
      id: `fallback-${product.id}`,
      severity: product.quantity_on_hand === 0 ? 'critical' : 'medium',
      title:
        product.quantity_on_hand === 0
          ? `${product.sku} is out of stock`
          : `${product.sku} is nearing its reorder point`,
      detail: `${product.name} · ${product.quantity_on_hand} units on hand`,
      timeLabel: 'Inventory watch',
      sortValue: product.quantity_on_hand,
    }))
}

const buildDeliveryRows = (
  purchaseOrders: PurchaseOrder[],
  purchaseOrderItems: PurchaseOrderItem[],
) => {
  const itemsByOrder = purchaseOrderItems.reduce((accumulator, item) => {
    const rows = accumulator.get(item.po_id) ?? []
    rows.push(item)
    accumulator.set(item.po_id, rows)
    return accumulator
  }, new Map<string, PurchaseOrderItem[]>())

  return purchaseOrders
    .filter((order) => order.status !== 'closed' && order.status !== 'cancelled')
    .map((order): DeliveryRow => {
      const lineItems = itemsByOrder.get(order.id) ?? []
      const orderedUnits = lineItems.reduce((sum, item) => sum + item.quantity_ordered, 0)
      const totalValue = lineItems.reduce((sum, item) => sum + item.quantity_ordered * item.unit_cost, 0)
      const overdue = !!order.expected_date && getDaysFromToday(order.expected_date) < 0
      const statusLabel = overdue ? 'Delayed' : order.status === 'partial' ? 'Pending' : 'On Time'
      const statusTone: DeliveryRow['statusTone'] = overdue
        ? 'delayed'
        : order.status === 'partial'
          ? 'pending'
          : 'on-time'

      return {
        id: order.id,
        poLabel: padPurchaseOrder(order.po_number),
        vendor: order.suppliers?.name ?? 'Unassigned supplier',
        itemsCountLabel: formatInteger(orderedUnits),
        valueLabel: formatCurrency(totalValue),
        expectedLabel: formatExpectedDate(order.expected_date),
        statusLabel,
        statusTone,
        sortValue: order.expected_date ? new Date(order.expected_date).getTime() : Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((left, right) => left.sortValue - right.sortValue)
    .slice(0, 6)
}

const buildVelocityGroups = (data: DashboardData) => {
  const topMoverIds = new Set(data.topMovers.map((item) => item.id))

  const fast = data.topMovers.slice(0, 5).map((item) => {
    const weeklyVelocity = Math.max(1, Math.round(item.totalSold / 4.3))
    const statusTone = classifyVelocityTone(weeklyVelocity)
    return {
      id: item.id,
      name: item.name,
      sku: item.sku,
      metricLabel: `${formatInteger(weeklyVelocity)} /wk`,
      statusLabel: statusTone === 'high' ? 'High' : 'Medium',
      statusTone,
    }
  })

  const slow = data.products
    .filter((product) => !topMoverIds.has(product.id) && product.quantity_on_hand > 0)
    .sort(
      (left, right) =>
        left.quantity_on_hand - left.reorder_point - (right.quantity_on_hand - right.reorder_point),
    )
    .slice(0, 5)
    .map((product) => {
      const weeklyVelocity = Math.max(1, Math.round(Math.max(product.quantity_on_hand - product.reorder_point, 1) / 4))
      const statusTone = classifyVelocityTone(weeklyVelocity)
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        metricLabel: `${formatInteger(weeklyVelocity)} /wk`,
        statusLabel: statusTone === 'high' ? 'High' : statusTone === 'medium' ? 'Medium' : 'Low',
        statusTone,
      }
    })

  const dead = data.products
    .filter((product) => !topMoverIds.has(product.id))
    .sort((left, right) => right.quantity_on_hand - left.quantity_on_hand)
    .slice(0, 5)
    .map((product) => ({
      id: product.id,
      name: product.name,
      sku: product.sku,
      metricLabel: `${formatInteger(product.quantity_on_hand)} idle units`,
      statusLabel: 'Dormant',
      statusTone: 'low' as VelocityTone,
    }))

  return { fast, slow, dead }
}

const MetricCard = ({ metric }: { metric: DashboardMetric }) => {
  const TrendIcon = metric.direction === 'down' ? ArrowDownRight : ArrowUpRight
  const showIcon = metric.direction !== 'neutral'

  return (
    <article className={`stoqr-dashboard__metric stoqr-dashboard__metric--${metric.tone}`}>
      <p className="stoqr-dashboard__metric-label">{metric.label}</p>
      <strong className="stoqr-dashboard__metric-value">{metric.value}</strong>
      <div className={`stoqr-dashboard__metric-accent is-${metric.direction}`}>
        {showIcon ? <TrendIcon size={13} /> : null}
        <span>{metric.accentLabel}</span>
      </div>
      <p className="stoqr-dashboard__metric-detail">{metric.detail}</p>
    </article>
  )
}

const MovementChart = ({ data }: { data: DashboardData['movementChartData'] }) => {
  const chartData = buildMovementChartWindow(data)
  const maxValue = Math.max(...chartData.flatMap((point) => [point.inbound, point.outbound]), 1)
  const hasMovementHistory = chartData.some((point) => point.inbound > 0 || point.outbound > 0)

  if (!hasMovementHistory) {
    return <div className="stoqr-dashboard__empty-panel">No movement history yet.</div>
  }

  return (
    <div className="stoqr-dashboard__movement" role="img" aria-label="Inbound and outbound inventory volume">
      {chartData.map((point) => (
        <div key={point.date} className="stoqr-dashboard__movement-group">
          <div className="stoqr-dashboard__movement-bars">
            <span
              className="stoqr-dashboard__movement-bar stoqr-dashboard__movement-bar--inbound"
              style={{ height: `${Math.max((point.inbound / maxValue) * 100, point.inbound > 0 ? 8 : 0)}%` }}
            />
            <span
              className="stoqr-dashboard__movement-bar stoqr-dashboard__movement-bar--outbound"
              style={{ height: `${Math.max((point.outbound / maxValue) * 100, point.outbound > 0 ? 8 : 0)}%` }}
            />
          </div>
          <span className="stoqr-dashboard__movement-label">{point.label}</span>
        </div>
      ))}
    </div>
  )
}

export const DashboardPage = () => {
  const { companyId } = useCompany()
  const { data, isLoading, isFetching, isError, error } = useDashboard(companyId)
  const { data: alertEvents = [] } = useAlertEvents(companyId)
  const { data: purchaseOrders = [] } = useProcurementPurchaseOrders(companyId)
  const { data: purchaseOrderItems = [] } = useProcurementPurchaseOrderItems(companyId)
  const [velocityTab, setVelocityTab] = useState<VelocityTabId>('fast')

  const shouldShowLoading = isLoading || (isFetching && !data)

  const pageModel = useMemo(() => {
    if (!data) return null

    const inventoryTrend = formatTrendPercent(data.chartData.map((point) => point.value))
    const movementTrend = formatTrendPercent(
      data.movementChartData.map((point) => point.inbound + point.outbound),
    )
    const criticalAttentionCount =
      alertEvents.filter((event) => event.status !== 'resolved' && event.severity === 'critical').length ||
      data.alertsSummary.criticalAlerts

    const deliveryRows = buildDeliveryRows(purchaseOrders, purchaseOrderItems)
    const attentionItems = buildAttentionItems(alertEvents, purchaseOrders, data)
    const velocityGroups = buildVelocityGroups(data)

    const metrics: DashboardMetric[] = [
      {
        label: 'Total Value',
        value: formatCompactCurrency(data.totalValue),
        accentLabel: inventoryTrend.text,
        detail: 'Inventory trend',
        tone: 'positive',
        direction: inventoryTrend.direction,
      },
      {
        label: 'Total Items',
        value: formatInteger(data.totalStockUnits),
        accentLabel: movementTrend.text,
        detail: `${formatInteger(data.products.length)} active SKUs`,
        tone: 'positive',
        direction: movementTrend.direction,
      },
      {
        label: 'Pending POs',
        value: formatInteger(data.pendingOrders),
        accentLabel: `${deliveryRows.length} scheduled`,
        detail: 'Inbound procurement',
        tone: 'neutral',
        direction: 'up',
      },
      {
        label: 'Out of Stock',
        value: formatInteger(data.outOfStockCount),
        accentLabel: `${criticalAttentionCount} critical`,
        detail: 'Immediate action',
        tone: 'danger',
        direction: data.outOfStockCount > 0 ? 'up' : 'neutral',
      },
      {
        label: 'Low Stock',
        value: formatInteger(data.lowStockCount),
        accentLabel: `${data.alertsSummary.reorderAlerts} reorder`,
        detail: 'Needs replenishment',
        tone: 'warning',
        direction: data.lowStockCount > 0 ? 'up' : 'neutral',
      },
    ]

    return {
      metrics,
      attentionItems,
      deliveryRows,
      velocityGroups,
    }
  }, [alertEvents, data, purchaseOrderItems, purchaseOrders])

  return (
    <BasePage
      companyId={companyId}
      isLoading={shouldShowLoading}
      emptyStateTitle="Welcome to Open StoQR"
      emptyStateDescription="Select or create a company to load your inventory dashboard."
      loadingMessage="Loading dashboard..."
      containerClassName="stoqr-dashboard"
      contentStyle={{ padding: '18px 8px 32px' }}
      containerStyle={{ minWidth: 0 }}
    >
      {isError ? (
        <div className="empty-state">
          {error instanceof Error ? error.message : 'Failed to load dashboard data.'}
        </div>
      ) : data && pageModel ? (
        <>
          <section className="stoqr-dashboard__summary" aria-label="Dashboard metrics">
            {pageModel.metrics.map((metric) => (
              <MetricCard key={metric.label} metric={metric} />
            ))}
          </section>

          <section className="stoqr-dashboard__layout stoqr-dashboard__layout--primary">
            <article className="stoqr-dashboard__section">
              <header className="stoqr-dashboard__section-header">
                <h2 className="stoqr-dashboard__section-title">Inbound vs Outbound Volume</h2>
                <div className="stoqr-dashboard__legend" aria-hidden="true">
                  <span className="stoqr-dashboard__legend-item">
                    <span className="stoqr-dashboard__legend-swatch stoqr-dashboard__legend-swatch--inbound" />
                    Inbound
                  </span>
                  <span className="stoqr-dashboard__legend-item">
                    <span className="stoqr-dashboard__legend-swatch stoqr-dashboard__legend-swatch--outbound" />
                    Outbound
                  </span>
                </div>
              </header>

              <MovementChart data={data.movementChartData} />
            </article>

            <article className="stoqr-dashboard__section stoqr-dashboard__section--alerts">
              <header className="stoqr-dashboard__section-header">
                <h2 className="stoqr-dashboard__section-title">Actionable Alerts</h2>
              </header>

              {pageModel.attentionItems.length > 0 ? (
                <div className="stoqr-dashboard__alerts-list">
                  {pageModel.attentionItems.map((item) => (
                    <div key={item.id} className="stoqr-dashboard__alert-row">
                      <span className={`stoqr-dashboard__alert-dot is-${item.severity}`} aria-hidden="true" />
                      <div className="stoqr-dashboard__alert-copy">
                        <p className="stoqr-dashboard__alert-title">{item.title}</p>
                        <p className="stoqr-dashboard__alert-detail">{item.detail}</p>
                      </div>
                      <span className="stoqr-dashboard__alert-time">{item.timeLabel}</span>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="stoqr-dashboard__empty-panel">No actionable alerts right now.</div>
              )}
            </article>
          </section>

          <section className="stoqr-dashboard__layout stoqr-dashboard__layout--secondary">
            <article className="stoqr-dashboard__section">
              <header className="stoqr-dashboard__section-header">
                <h2 className="stoqr-dashboard__section-title">Expected Deliveries</h2>
              </header>

              {pageModel.deliveryRows.length > 0 ? (
                <>
                  <div className="stoqr-dashboard__deliveries-desktop">
                    <table className="stoqr-dashboard__deliveries-table">
                      <thead>
                        <tr>
                          <th>PO Number</th>
                          <th>Vendor</th>
                          <th>Items</th>
                          <th>Value</th>
                          <th>Expected</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {pageModel.deliveryRows.map((row) => (
                          <tr key={row.id}>
                            <td>{row.poLabel}</td>
                            <td>{row.vendor}</td>
                            <td>{row.itemsCountLabel}</td>
                            <td>{row.valueLabel}</td>
                            <td>{row.expectedLabel}</td>
                            <td>
                              <span className={`stoqr-dashboard__status-pill is-${row.statusTone}`}>{row.statusLabel}</span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="stoqr-dashboard__deliveries-mobile">
                    {pageModel.deliveryRows.map((row) => (
                      <div key={row.id} className="stoqr-dashboard__delivery-card">
                        <div className="stoqr-dashboard__delivery-card-row">
                          <span className="stoqr-dashboard__delivery-card-po">{row.poLabel}</span>
                          <span className={`stoqr-dashboard__status-pill is-${row.statusTone}`}>{row.statusLabel}</span>
                        </div>
                        <p className="stoqr-dashboard__delivery-card-vendor">{row.vendor}</p>
                        <div className="stoqr-dashboard__delivery-card-meta">
                          <span>{row.itemsCountLabel} items</span>
                          <span>{row.valueLabel}</span>
                          <span>{row.expectedLabel}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              ) : (
                <div className="stoqr-dashboard__empty-panel">No deliveries scheduled.</div>
              )}
            </article>

            <article className="stoqr-dashboard__section stoqr-dashboard__section--velocity">
              <header className="stoqr-dashboard__section-header stoqr-dashboard__section-header--compact">
                <h2 className="stoqr-dashboard__section-title">Item Velocity</h2>
                <div className="stoqr-dashboard__velocity-toggle" role="tablist" aria-label="Velocity range">
                  {velocityTabs.map((tab) => (
                    <button
                      key={tab.id}
                      type="button"
                      className={`stoqr-dashboard__velocity-toggle-button${velocityTab === tab.id ? ' is-active' : ''}`}
                      onClick={() => setVelocityTab(tab.id)}
                    >
                      {tab.label}
                    </button>
                  ))}
                </div>
              </header>

              {(pageModel.velocityGroups[velocityTab] as VelocityItem[]).length > 0 ? (
                <div className="stoqr-dashboard__velocity-list">
                  {(pageModel.velocityGroups[velocityTab] as VelocityItem[]).map((item) => (
                    <div key={item.id} className="stoqr-dashboard__velocity-row">
                      <div className="stoqr-dashboard__velocity-copy">
                        <p className="stoqr-dashboard__velocity-name">{item.name}</p>
                        <p className="stoqr-dashboard__velocity-sku">{item.sku}</p>
                      </div>
                      <div className="stoqr-dashboard__velocity-meta">
                        <span className="stoqr-dashboard__velocity-rate">{item.metricLabel}</span>
                        <span className={`stoqr-dashboard__velocity-status is-${item.statusTone}`}>{item.statusLabel}</span>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="stoqr-dashboard__empty-panel">
                  No inventory movement yet. Add products and transactions to populate velocity insights.
                </div>
              )}
            </article>
          </section>
        </>
      ) : (
        <div className="empty-state">No dashboard data available.</div>
      )}
    </BasePage>
  )
}