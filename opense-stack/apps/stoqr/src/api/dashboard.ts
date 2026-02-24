import { supabase } from '../supabaseClient'

type ProductSummary = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  reorder_point: number
  cost_price: number
  selling_price: number
}

type TransactionSummary = {
  id: string
  transaction_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'loss'
  quantity_change: number
  created_at: string
  products: { name: string; sku: string } | null
  profiles: { full_name: string | null; username: string | null } | null
}

type TopMover = {
  id: string
  name: string
  sku: string
  totalSold: number
  revenue: number
}

type DashboardSnapshotRpc = {
  kpis?: {
    total_inventory_value?: number | string | null
    total_stock_units?: number | string | null
    low_stock_items?: number | string | null
    out_of_stock_items?: number | string | null
    pending_orders?: number | string | null
  }
  alerts_summary?: {
    open_alerts?: number | string | null
    critical_alerts?: number | string | null
    low_stock_alerts?: number | string | null
    reorder_alerts?: number | string | null
    expiration_alerts?: number | string | null
  }
  charts?: {
    inventory_trend?: Array<{ day: string; delta: number | string | null }>
    usage_trend?: Array<{ day: string; usage: number | string | null }>
  }
}

type ReportValuationRpcRow = {
  product_id: string
  sku: string
  name: string
  quantity_on_hand: number | string | null
  reorder_point: number | string | null
  cost_price: number | string | null
  selling_price: number | string | null
}

type ReportStockMovementRpcRow = {
  transaction_id: string
  created_at: string
  transaction_type: string
  quantity_change: number | string
  product_id: string
  sku: string
  product_name: string
  performer_name: string | null
}

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const normalizeTransactionType = (
  transactionType: string,
): 'purchase' | 'sale' | 'return' | 'adjustment' | 'loss' => {
  if (transactionType === 'scan_in') return 'purchase'
  if (transactionType === 'scan_out') return 'sale'
  if (transactionType === 'purchase' || transactionType === 'sale' || transactionType === 'return' || transactionType === 'adjustment' || transactionType === 'loss') {
    return transactionType
  }
  return 'adjustment'
}

export type DashboardData = {
  products: ProductSummary[]
  transactions: TransactionSummary[]
  revenue30Days: number
  totalValue: number
  totalStockUnits: number
  pendingOrders: number
  lowStockCount: number
  outOfStockCount: number
  topMovers: TopMover[]
  chartData: { date: string; value: number }[]
  usageChartData: { date: string; value: number }[]
  alertsSummary: {
    openAlerts: number
    criticalAlerts: number
    lowStockAlerts: number
    reorderAlerts: number
    expirationAlerts: number
  }
}

export const fetchDashboardData = async (companyId: string): Promise<DashboardData> => {
  const thirtyDaysAgoIso = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()
  const nowIso = new Date().toISOString()

  const [{ data: snapshotData, error: snapshotError }, { data: valuationData, error: valuationError }, { data: movementData, error: movementError }] = await Promise.all([
    supabase.rpc('get_stoqr_dashboard_snapshot', {
      target_company_id: companyId,
      p_days: 30,
      p_activity_limit: 7,
    }),
    supabase.rpc('get_stoqr_report_inventory_valuation', { target_company_id: companyId }),
    supabase.rpc('get_stoqr_report_stock_movements', {
      target_company_id: companyId,
      p_start: thirtyDaysAgoIso,
      p_end: nowIso,
    }),
  ])

  if (snapshotError) throw snapshotError
  if (valuationError) throw valuationError
  if (movementError) throw movementError

  const snapshot = (snapshotData ?? {}) as DashboardSnapshotRpc
  const valuationRows = ((valuationData ?? []) as ReportValuationRpcRow[])
  const movementRows = ((movementData ?? []) as ReportStockMovementRpcRow[])

  const products: ProductSummary[] = valuationRows.map((row) => ({
    id: row.product_id,
    name: row.name,
    sku: row.sku,
    quantity_on_hand: toNumber(row.quantity_on_hand, 0),
    reorder_point: toNumber(row.reorder_point, 0),
    cost_price: toNumber(row.cost_price, 0),
    selling_price: toNumber(row.selling_price, 0),
  }))

  const productById = new Map(products.map((product) => [product.id, product]))

  const revenue30Days = movementRows.reduce((sum, row) => {
    const normalizedType = normalizeTransactionType(row.transaction_type)
    if (normalizedType !== 'sale') return sum
    const quantity = Math.abs(toNumber(row.quantity_change, 0))
    const sellingPrice = productById.get(row.product_id)?.selling_price ?? 0
    return sum + quantity * sellingPrice
  }, 0)

  const moverMap = new Map<string, TopMover>()
  movementRows.forEach((row) => {
    const normalizedType = normalizeTransactionType(row.transaction_type)
    if (normalizedType !== 'sale') return

    const quantity = Math.abs(toNumber(row.quantity_change, 0))
    const product = productById.get(row.product_id)
    const revenue = quantity * (product?.selling_price ?? 0)

    const existing = moverMap.get(row.product_id)
    if (existing) {
      existing.totalSold += quantity
      existing.revenue += revenue
      return
    }

    moverMap.set(row.product_id, {
      id: row.product_id,
      name: row.product_name,
      sku: row.sku,
      totalSold: quantity,
      revenue,
    })
  })

  const topMovers = Array.from(moverMap.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5)

  const transactions: TransactionSummary[] = movementRows.slice(0, 7).map((row) => ({
    id: row.transaction_id,
    transaction_type: normalizeTransactionType(row.transaction_type),
    quantity_change: toNumber(row.quantity_change, 0),
    created_at: row.created_at,
    products: { name: row.product_name, sku: row.sku },
    profiles: { full_name: row.performer_name, username: null },
  }))

  const trendRows = snapshot.charts?.inventory_trend ?? []
  const totalValue = toNumber(snapshot.kpis?.total_inventory_value, 0)
  const totalDelta = trendRows.reduce((sum, point) => sum + toNumber(point.delta, 0), 0)
  let runningValue = totalValue - totalDelta

  const chartData = trendRows
    .slice()
    .sort((left, right) => String(left.day).localeCompare(String(right.day)))
    .map((point) => {
      runningValue += toNumber(point.delta, 0)
      return {
        date: String(point.day),
        value: runningValue,
      }
    })

  const usageChartData = (snapshot.charts?.usage_trend ?? [])
    .slice()
    .sort((left, right) => String(left.day).localeCompare(String(right.day)))
    .map((point) => ({
      date: String(point.day),
      value: toNumber(point.usage, 0),
    }))

  return {
    products,
    transactions,
    revenue30Days,
    totalValue,
    totalStockUnits: toNumber(snapshot.kpis?.total_stock_units, 0),
    pendingOrders: toNumber(snapshot.kpis?.pending_orders, 0),
    lowStockCount: toNumber(snapshot.kpis?.low_stock_items, 0),
    outOfStockCount: toNumber(snapshot.kpis?.out_of_stock_items, 0),
    topMovers,
    chartData,
    usageChartData,
    alertsSummary: {
      openAlerts: toNumber(snapshot.alerts_summary?.open_alerts, 0),
      criticalAlerts: toNumber(snapshot.alerts_summary?.critical_alerts, 0),
      lowStockAlerts: toNumber(snapshot.alerts_summary?.low_stock_alerts, 0),
      reorderAlerts: toNumber(snapshot.alerts_summary?.reorder_alerts, 0),
      expirationAlerts: toNumber(snapshot.alerts_summary?.expiration_alerts, 0),
    },
  }
}
