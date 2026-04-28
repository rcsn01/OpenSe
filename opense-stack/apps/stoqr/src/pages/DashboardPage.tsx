import { useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import type { LucideIcon } from 'lucide-react'
import {
  AlertTriangle,
  ArrowRightLeft,
  BellRing,
  ClipboardList,
  Clock3,
  Layers3,
  Package,
} from 'lucide-react'
import {
  Badge,
  Button,
  Card,
  DataTable,
  TabBar,
} from '@repo/ui'
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
type StatTone = 'value' | 'catalog' | 'critical' | 'warning'
type TrendDirection = 'up' | 'down' | 'neutral'
type AttentionSeverity = 'critical' | 'high' | 'medium' | 'low'

type DashboardStat = {
  label: string
  value: string
  trend: string
  footnote: string
  direction: TrendDirection
  tone: StatTone
  icon: LucideIcon
  sparkline: number[]
}

type AttentionItem = {
  id: string
  severity: AttentionSeverity
  title: string
  subtitle: string
  detail: string
  sortValue: number
}

type DeliveryRow = {
  id: string
  vendor: string
  poLabel: string
  itemsLabel: string
  expectedLabel: string
  statusLabel: string
  statusVariant: 'success' | 'warning' | 'destructive' | 'secondary'
  sortValue: number
}

type VelocityItem = {
  id: string
  name: string
  sku: string
  metricLabel: string
  barValue: number
}

const velocityTabs: Array<{ id: VelocityTabId; label: string }> = [
  { id: 'fast', label: 'Fast Moving' },
  { id: 'slow', label: 'Slow Moving' },
  { id: 'dead', label: 'Dead Stock' },
]

const fallbackSparkline = [12, 16, 14, 18, 22, 24, 28]

const fallbackMovementChart = [
  { date: '2026-04-07', inbound: 8, outbound: 4 },
  { date: '2026-04-08', inbound: 11, outbound: 6 },
  { date: '2026-04-09', inbound: 13, outbound: 8 },
  { date: '2026-04-10', inbound: 10, outbound: 9 },
  { date: '2026-04-11', inbound: 12, outbound: 10 },
  { date: '2026-04-12', inbound: 17, outbound: 13 },
  { date: '2026-04-13', inbound: 15, outbound: 17 },
]

const attentionPriority: Record<AttentionSeverity, number> = {
  critical: 4,
  high: 3,
  medium: 2,
  low: 1,
}

const severityBadgeVariant: Record<AttentionSeverity, 'destructive' | 'warning' | 'secondary'> = {
  critical: 'destructive',
  high: 'warning',
  medium: 'warning',
  low: 'secondary',
}

const formatCompactCurrency = (value: number) =>
  new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    notation: 'compact',
    maximumFractionDigits: 2,
  }).format(value)

const formatCompactNumber = (value: number) =>
  new Intl.NumberFormat('en-US', {
    notation: 'compact',
    maximumFractionDigits: value >= 1000 ? 1 : 0,
  }).format(value)

const formatTrendPercent = (values: number[]) => {
  if (values.length < 2) return { text: 'stable', direction: 'neutral' as TrendDirection }

  const first = values[0] ?? 0
  const last = values[values.length - 1] ?? 0

  if (first === 0) {
    if (last === 0) return { text: 'stable', direction: 'neutral' as TrendDirection }
    return { text: `+${formatCompactNumber(last)}`, direction: 'up' as TrendDirection }
  }

  const percent = ((last - first) / Math.abs(first)) * 100
  if (Math.abs(percent) < 0.5) return { text: 'stable', direction: 'neutral' as TrendDirection }

  return {
    text: `${percent > 0 ? '+' : ''}${percent.toFixed(Math.abs(percent) >= 10 ? 0 : 1)}%`,
    direction: percent > 0 ? 'up' : 'down',
  }
}

const formatDayLabel = (value: string) =>
  new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(new Date(value))

const formatShortDate = (value: string | null) => {
  if (!value) return 'TBD'
  return new Intl.DateTimeFormat('en-US', { month: 'short', day: 'numeric' }).format(new Date(value))
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

const formatRelativeTimestamp = (value: string) => {
  const diffMs = Date.now() - new Date(value).getTime()
  const diffHours = Math.round(diffMs / (60 * 60 * 1000))
  const diffDays = Math.round(diffMs / (24 * 60 * 60 * 1000))

  if (diffHours <= 0) return 'just now'
  if (diffHours < 24) return `${diffHours} hr${diffHours === 1 ? '' : 's'} ago`
  return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`
}

const padPurchaseOrder = (value: number) => `PO-${String(value).padStart(4, '0')}`

const buildFallbackSeries = (count: number, pattern: number[]) =>
  pattern.map((multiplier) => Math.max(1, Math.round(Math.max(count, 1) * multiplier)))

type ChartPoint = { x: number; y: number }

const buildPoints = (
  values: number[],
  width: number,
  height: number,
  padding: { top: number; right: number; bottom: number; left: number },
) => {
  const usableWidth = width - padding.left - padding.right
  const usableHeight = height - padding.top - padding.bottom
  const maxValue = Math.max(...values, 1)
  const stepX = values.length > 1 ? usableWidth / (values.length - 1) : usableWidth

  return values.map((value, index) => ({
    x: padding.left + stepX * index,
    y: padding.top + usableHeight - (value / maxValue) * usableHeight,
  }))
}

const buildLinePath = (points: ChartPoint[]) =>
  points.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

const buildAreaPath = (points: ChartPoint[], baseY: number) => {
  if (points.length === 0) return ''
  const first = points[0]
  const last = points[points.length - 1]
  return `${buildLinePath(points)} L ${last.x} ${baseY} L ${first.x} ${baseY} Z`
}

const buildAttentionItems = (
  alertEvents: AlertEvent[],
  purchaseOrders: PurchaseOrder[],
  data: DashboardData,
): AttentionItem[] => {
  const alertRows = alertEvents
    .filter((event) => event.status !== 'resolved')
    .map((event) => ({
      id: `alert-${event.id}`,
      severity: event.severity,
      title: event.message,
      subtitle: event.products?.sku ? `SKU: ${event.products.sku}` : 'System alert',
      detail: event.products?.name
        ? `${event.products.name} • ${formatRelativeTimestamp(event.triggered_at)}`
        : formatRelativeTimestamp(event.triggered_at),
      sortValue: new Date(event.triggered_at).getTime(),
    }))

  const overdueOrders = purchaseOrders
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
        title: `Delayed Shipment: ${padPurchaseOrder(order.po_number)}`,
        subtitle: `Vendor: ${order.suppliers?.name ?? 'Unassigned supplier'}`,
        detail: `${overdueDays} day${overdueDays === 1 ? '' : 's'} overdue`,
        sortValue: new Date(order.expected_date as string).getTime(),
      }
    })

  const combined = [...alertRows, ...overdueOrders]
    .sort((left, right) => {
      const severityDelta = attentionPriority[right.severity] - attentionPriority[left.severity]
      if (severityDelta !== 0) return severityDelta
      return right.sortValue - left.sortValue
    })
    .slice(0, 4)

  if (combined.length > 0) return combined

  return data.products
    .filter((product) => product.quantity_on_hand <= product.reorder_point)
    .slice(0, 4)
    .map((product) => ({
      id: `fallback-${product.id}`,
      severity: product.quantity_on_hand === 0 ? 'critical' : 'medium',
      title:
        product.quantity_on_hand === 0
          ? `Stockout: ${product.name}`
          : `Expiring stock window: ${product.name}`,
      subtitle: `SKU: ${product.sku}`,
      detail:
        product.quantity_on_hand === 0
          ? 'Inventory is fully depleted.'
          : `${product.quantity_on_hand} units remaining before reorder point.`,
      sortValue: product.quantity_on_hand,
    }))
}

const buildDeliveryRows = (
  purchaseOrders: PurchaseOrder[],
  purchaseOrderItems: PurchaseOrderItem[],
): DeliveryRow[] => {
  const itemsByOrder = purchaseOrderItems.reduce((acc, item) => {
    const rows = acc.get(item.po_id) ?? []
    rows.push(item)
    acc.set(item.po_id, rows)
    return acc
  }, new Map<string, PurchaseOrderItem[]>())

  return purchaseOrders
    .filter((order) => order.status !== 'closed' && order.status !== 'cancelled')
    .map((order) => {
      const lineItems = itemsByOrder.get(order.id) ?? []
      const orderedUnits = lineItems.reduce((sum, item) => sum + item.quantity_ordered, 0)
      const leadItem = lineItems[0]?.products?.name ?? 'Pending line items'
      const itemsLabel =
        lineItems.length <= 1
          ? `${leadItem}${orderedUnits > 0 ? ` (${orderedUnits} units)` : ''}`
          : `${leadItem} +${lineItems.length - 1} more (${orderedUnits} units)`

      const overdue = !!order.expected_date && getDaysFromToday(order.expected_date) < 0
      const dueSoon = !!order.expected_date && getDaysFromToday(order.expected_date) <= 1
      const statusLabel = overdue
        ? 'Overdue'
        : order.status === 'partial'
          ? 'Partial'
          : dueSoon
            ? 'Due Soon'
            : 'Scheduled'

      return {
        id: order.id,
        vendor: order.suppliers?.name ?? 'Unassigned supplier',
        poLabel: padPurchaseOrder(order.po_number),
        itemsLabel,
        expectedLabel: formatExpectedDate(order.expected_date),
        statusLabel,
        statusVariant: overdue
          ? 'destructive'
          : order.status === 'partial'
            ? 'warning'
            : dueSoon
              ? 'secondary'
              : 'success',
        sortValue: order.expected_date ? new Date(order.expected_date).getTime() : Number.MAX_SAFE_INTEGER,
      }
    })
    .sort((left, right) => left.sortValue - right.sortValue)
    .slice(0, 5)
}

const buildVelocityGroups = (data: DashboardData) => {
  const topMoverIds = new Set(data.topMovers.map((item) => item.id))

  const fast = data.topMovers.slice(0, 5).map((item) => ({
    id: item.id,
    name: item.name,
    sku: item.sku,
    metricLabel: `${item.totalSold.toLocaleString()} units/mo`,
    barValue: Math.max(item.totalSold, 1),
  }))

  const slow = data.products
    .filter((product) => !topMoverIds.has(product.id) && product.quantity_on_hand > 0)
    .sort(
      (left, right) =>
        left.quantity_on_hand - left.reorder_point - (right.quantity_on_hand - right.reorder_point),
    )
    .slice(0, 5)
    .map((product) => {
      const estimatedVelocity = Math.max(1, Math.round(Math.max(product.quantity_on_hand - product.reorder_point, 1) / 3))
      return {
        id: product.id,
        name: product.name,
        sku: product.sku,
        metricLabel: `${estimatedVelocity.toLocaleString()} units/mo`,
        barValue: estimatedVelocity,
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
      metricLabel: `${product.quantity_on_hand.toLocaleString()} idle units`,
      barValue: Math.max(product.quantity_on_hand, 1),
    }))

  return { fast, slow, dead }
}

const MiniSparkline = ({ values, tone }: { values: number[]; tone: StatTone }) => {
  const resolvedValues = values.length > 1 ? values : fallbackSparkline
  const width = 240
  const height = 44
  const padding = { top: 4, right: 4, bottom: 2, left: 4 }
  const points = buildPoints(resolvedValues, width, height, padding)
  const linePath = buildLinePath(points)
  const areaPath = buildAreaPath(points, height - padding.bottom)

  return (
    <svg className="stoqr-dashboard__sparkline" viewBox={`0 0 ${width} ${height}`} aria-hidden="true">
      <defs>
        <linearGradient id={`spark-fill-${tone}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" className={`stoqr-dashboard__spark-stop stoqr-dashboard__spark-stop--${tone}`} stopOpacity="0.32" />
          <stop offset="100%" className={`stoqr-dashboard__spark-stop stoqr-dashboard__spark-stop--${tone}`} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={areaPath} fill={`url(#spark-fill-${tone})`} />
      <path d={linePath} fill="none" className={`stoqr-dashboard__spark-line stoqr-dashboard__spark-line--${tone}`} />
    </svg>
  )
}

const StatCard = ({ card }: { card: DashboardStat }) => {
  const Icon = card.icon

  return (
    <Card className={`stoqr-dashboard__stat-card stoqr-dashboard__stat-card--${card.tone}`} padding="md">
      <div className="stoqr-dashboard__stat-header">
        <div>
          <p className="stoqr-dashboard__stat-label">{card.label}</p>
        </div>
        <span className="stoqr-dashboard__stat-icon" aria-hidden="true">
          <Icon size={18} />
        </span>
      </div>

      <div className="stoqr-dashboard__stat-value-row">
        <strong className="stoqr-dashboard__stat-value">{card.value}</strong>
        <span className={`stoqr-dashboard__stat-trend is-${card.direction}`}>{card.trend}</span>
      </div>

      <p className="stoqr-dashboard__stat-footnote">{card.footnote}</p>
      <MiniSparkline values={card.sparkline} tone={card.tone} />
    </Card>
  )
}

const MovementChart = ({ data }: { data: DashboardData['movementChartData'] }) => {
  const chartData = (data.length > 0 ? data.slice(-7) : fallbackMovementChart).map((point) => ({
    ...point,
    label: formatDayLabel(point.date),
  }))

  const width = 680
  const height = 236
  const padding = { top: 16, right: 18, bottom: 30, left: 12 }
  const baselineY = height - padding.bottom
  const inboundPoints = buildPoints(chartData.map((point) => point.inbound), width, height, padding)
  const outboundPoints = buildPoints(chartData.map((point) => point.outbound), width, height, padding)
  const inboundPath = buildLinePath(inboundPoints)
  const outboundPath = buildLinePath(outboundPoints)
  const outboundArea = buildAreaPath(outboundPoints, baselineY)

  return (
    <div className="stoqr-dashboard__chart-area">
      <svg className="stoqr-dashboard__chart-svg" viewBox={`0 0 ${width} ${height}`} role="img" aria-label="Inbound and outbound inventory volume">
        <defs>
          <linearGradient id="movement-outbound-fill" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-primary)" stopOpacity="0.18" />
            <stop offset="100%" stopColor="var(--color-primary)" stopOpacity="0.02" />
          </linearGradient>
        </defs>

        {Array.from({ length: 4 }).map((_, index) => {
          const y = padding.top + ((baselineY - padding.top) / 3) * index
          return <line key={y} x1={padding.left} x2={width - padding.right} y1={y} y2={y} className="stoqr-dashboard__chart-grid" />
        })}

        <path d={outboundArea} fill="url(#movement-outbound-fill)" />
        <path d={inboundPath} fill="none" className="stoqr-dashboard__chart-line stoqr-dashboard__chart-line--inbound" />
        <path d={outboundPath} fill="none" className="stoqr-dashboard__chart-line stoqr-dashboard__chart-line--outbound" />

        {inboundPoints.map((point, index) => (
          <circle key={`inbound-${index}`} cx={point.x} cy={point.y} r="3.5" className="stoqr-dashboard__chart-dot stoqr-dashboard__chart-dot--inbound" />
        ))}
        {outboundPoints.map((point, index) => (
          <circle key={`outbound-${index}`} cx={point.x} cy={point.y} r="3.5" className="stoqr-dashboard__chart-dot stoqr-dashboard__chart-dot--outbound" />
        ))}

        {chartData.map((point, index) => {
          const labelX = inboundPoints[index]?.x ?? padding.left
          return (
            <text key={point.date} x={labelX} y={height - 10} textAnchor="middle" className="stoqr-dashboard__chart-axis-label">
              {point.label}
            </text>
          )
        })}
      </svg>

      <div className="stoqr-dashboard__chart-legend" aria-hidden="true">
        <span className="stoqr-dashboard__legend-item">
          <span className="stoqr-dashboard__legend-dot stoqr-dashboard__legend-dot--inbound" />
          Inbound
        </span>
        <span className="stoqr-dashboard__legend-item">
          <span className="stoqr-dashboard__legend-dot stoqr-dashboard__legend-dot--outbound" />
          Outbound
        </span>
      </div>
    </div>
  )
}

export const DashboardPage = () => {
  const navigate = useNavigate()
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
    const criticalAlertCount =
      alertEvents.filter((event) => event.status !== 'resolved' && event.severity === 'critical').length ||
      data.alertsSummary.criticalAlerts
    const activeSkuCount = data.products.filter((product) => product.quantity_on_hand > 0).length

    const statCards: DashboardStat[] = [
      {
        label: 'Total Inventory Value',
        value: formatCompactCurrency(data.totalValue),
        trend: inventoryTrend.text,
        footnote: 'vs last month',
        direction: inventoryTrend.direction,
        tone: 'value',
        icon: Package,
        sparkline: data.chartData.slice(-7).map((point) => point.value),
      },
      {
        label: 'Total Items / SKUs',
        value: formatCompactNumber(data.products.length),
        trend: `${formatCompactNumber(activeSkuCount)} active`,
        footnote: 'catalog coverage',
        direction: movementTrend.direction,
        tone: 'catalog',
        icon: Layers3,
        sparkline: data.movementChartData.slice(-7).map((point) => point.inbound + point.outbound),
      },
      {
        label: 'Items Out of Stock',
        value: formatCompactNumber(data.outOfStockCount),
        trend: `${criticalAlertCount} critical`,
        footnote: 'needs immediate restock',
        direction: data.outOfStockCount > 0 ? 'up' : 'neutral',
        tone: 'critical',
        icon: AlertTriangle,
        sparkline: buildFallbackSeries(data.outOfStockCount, [0.25, 0.35, 0.22, 0.4, 0.58, 0.78, 1]),
      },
      {
        label: 'Low Stock Items',
        value: formatCompactNumber(data.lowStockCount),
        trend: `${data.alertsSummary.reorderAlerts} reorder`,
        footnote: 'below reorder point',
        direction: data.lowStockCount > 0 ? 'down' : 'neutral',
        tone: 'warning',
        icon: ClipboardList,
        sparkline: buildFallbackSeries(data.lowStockCount, [1, 0.9, 0.84, 0.65, 0.48, 0.34, 0.2]),
      },
    ]

    const attentionItems = buildAttentionItems(alertEvents, purchaseOrders, data)
    const deliveryRows = buildDeliveryRows(purchaseOrders, purchaseOrderItems)
    const velocityGroups = buildVelocityGroups(data)

    return {
      statCards,
      attentionItems,
      deliveryRows,
      velocityGroups,
      criticalAttentionCount: attentionItems.filter((item) => item.severity === 'critical').length,
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
      contentStyle={{ padding: '12px' }}
      containerStyle={{ minWidth: 0 }}
    >
      {isError ? (
        <div className="empty-state">
          {error instanceof Error ? error.message : 'Failed to load dashboard data.'}
        </div>
      ) : data && pageModel ? (
        <>
          <section className="stoqr-dashboard__stats" aria-label="Dashboard metrics">
            {pageModel.statCards.map((card) => (
              <StatCard key={card.label} card={card} />
            ))}
          </section>

          <section className="stoqr-dashboard__grid stoqr-dashboard__grid--top">
            <Card className="stoqr-dashboard__panel" padding="md">
              <div className="stoqr-dashboard__panel-header">
                <div className="stoqr-dashboard__panel-title-block">
                  <div className="stoqr-dashboard__panel-title">
                    <ArrowRightLeft size={18} />
                    <h2 className="stoqr-dashboard__panel-heading">Inbound vs. Outbound Volume</h2>
                  </div>
                </div>
                <Badge variant="outline" size="sm">Last 30 Days</Badge>
              </div>

              <MovementChart data={data.movementChartData} />
            </Card>

            <Card className="stoqr-dashboard__panel stoqr-dashboard__panel--attention" padding="md">
              <div className="stoqr-dashboard__panel-header">
                <div className="stoqr-dashboard__panel-title">
                  <BellRing size={18} />
                  <h2 className="stoqr-dashboard__panel-heading">Needs Attention</h2>
                </div>
                <Badge
                  variant={pageModel.criticalAttentionCount > 0 ? 'destructive' : 'success'}
                  size="sm"
                >
                  {pageModel.criticalAttentionCount > 0
                    ? `${pageModel.criticalAttentionCount} Critical`
                    : 'Stable'}
                </Badge>
              </div>

              {pageModel.attentionItems.length > 0 ? (
                <div className="stoqr-dashboard__attention-list">
                  {pageModel.attentionItems.map((item) => (
                    <div key={item.id} className="stoqr-dashboard__attention-item">
                      <div className="stoqr-dashboard__attention-main">
                        <span className={`stoqr-dashboard__attention-dot is-${item.severity}`} aria-hidden="true" />
                        <div className="stoqr-dashboard__attention-copy">
                          <p className="stoqr-dashboard__attention-title">{item.title}</p>
                          <p className="stoqr-dashboard__attention-subtitle">{item.subtitle}</p>
                          <p className="stoqr-dashboard__attention-detail">{item.detail}</p>
                        </div>
                      </div>
                      <Badge variant={severityBadgeVariant[item.severity]} size="sm">
                        {item.severity}
                      </Badge>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="stoqr-dashboard__empty-panel">No active alerts or overdue shipments.</div>
              )}

              <div className="stoqr-dashboard__panel-footer">
                <Button variant="ghost" size="sm" onClick={() => navigate('/alerts/feed')}>
                  View all alerts
                </Button>
              </div>
            </Card>
          </section>

          <section className="stoqr-dashboard__grid stoqr-dashboard__grid--bottom">
            <Card className="stoqr-dashboard__panel" padding="md">
              <div className="stoqr-dashboard__panel-header stoqr-dashboard__panel-header--stacked">
                <div className="stoqr-dashboard__panel-title">
                  <Package size={18} />
                  <h2 className="stoqr-dashboard__panel-heading">Item Velocity</h2>
                </div>
                <div className="stoqr-dashboard__velocity-tabs">
                  <TabBar
                    tabs={velocityTabs}
                    activeTab={velocityTab}
                    onTabChange={(tabId) => setVelocityTab(tabId as VelocityTabId)}
                    className="stoqr-dashboard__velocity-tabbar"
                    itemClassName="stoqr-dashboard__velocity-tab"
                    activeItemClassName="stoqr-dashboard__velocity-tab is-active"
                    inactiveItemClassName="stoqr-dashboard__velocity-tab is-inactive"
                  />
                </div>
              </div>

              <div className="stoqr-dashboard__velocity-list">
                {(pageModel.velocityGroups[velocityTab] as VelocityItem[]).map((item) => {
                  const maxValue = Math.max(
                    ...(pageModel.velocityGroups[velocityTab] as VelocityItem[]).map((entry) => entry.barValue),
                    1,
                  )

                  return (
                    <div key={item.id} className="stoqr-dashboard__velocity-item">
                      <div className="stoqr-dashboard__velocity-copy">
                        <p className="stoqr-dashboard__velocity-name">{item.name}</p>
                        <p className="stoqr-dashboard__velocity-sku">{item.sku}</p>
                      </div>
                      <div className="stoqr-dashboard__velocity-bar-track" aria-hidden="true">
                        <span
                          className="stoqr-dashboard__velocity-bar-fill"
                          style={{ width: `${(item.barValue / maxValue) * 100}%` }}
                        />
                      </div>
                      <span className="stoqr-dashboard__velocity-metric">{item.metricLabel}</span>
                    </div>
                  )
                })}
              </div>
            </Card>

            <Card className="stoqr-dashboard__panel" padding="md">
              <div className="stoqr-dashboard__panel-header">
                <div className="stoqr-dashboard__panel-title">
                  <Clock3 size={18} />
                  <h2 className="stoqr-dashboard__panel-heading">Expected Deliveries</h2>
                </div>
                <span className="stoqr-dashboard__panel-meta">Pending POs: {data.pendingOrders}</span>
              </div>

              {pageModel.deliveryRows.length > 0 ? (
                <DataTable
                  columns={[
                    {
                      id: 'vendor-po',
                      header: 'Vendor / PO',
                      renderCell: (row: DeliveryRow) => (
                        <>
                          <div className="stoqr-dashboard__delivery-vendor">{row.vendor}</div>
                          <div className="stoqr-dashboard__delivery-po">{row.poLabel}</div>
                        </>
                      ),
                    },
                    {
                      id: 'items',
                      header: 'Items',
                      cellClassName: 'stoqr-dashboard__delivery-items',
                      renderCell: (row: DeliveryRow) => row.itemsLabel,
                    },
                    {
                      id: 'expected',
                      header: 'Expected',
                      align: 'right',
                      headerClassName: 'stoqr-dashboard__table-head--right',
                      cellClassName: 'stoqr-dashboard__delivery-expected',
                      renderCell: (row: DeliveryRow) => (
                        <>
                          <span>{row.expectedLabel}</span>
                          <Badge variant={row.statusVariant} size="sm">{row.statusLabel}</Badge>
                        </>
                      ),
                    },
                  ]}
                  rows={pageModel.deliveryRows}
                  getRowId={(row) => row.id}
                  tableWrapClassName="stoqr-dashboard__table-scroll border-0 rounded-none"
                  tableClassName="stoqr-dashboard__deliveries-table"
                />
              ) : (
                <div className="stoqr-dashboard__empty-panel">No deliveries scheduled.</div>
              )}

              <div className="stoqr-dashboard__panel-footer">
                <Button variant="ghost" size="sm" onClick={() => navigate('/procurement/purchase-orders')}>
                  View purchase orders
                </Button>
              </div>
            </Card>
          </section>
        </>
      ) : (
        <div className="empty-state">No dashboard data available.</div>
      )}
    </BasePage>
  )
}