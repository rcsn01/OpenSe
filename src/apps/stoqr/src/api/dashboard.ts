import { db } from '../supabaseClient'

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
  movementChartData: { date: string; inbound: number; outbound: number }[]
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
  const pendingStatuses = [
    'pending_approval',
    'approved',
    'not_started',
    'awaiting_supplier',
    'in_transit',
    'partial_receipt',
    'awaiting_return',
    'shipped_to_vendor',
  ]

  const [
    { data: valuationData, error: valuationError },
    { data: movementData, error: movementError },
    { count: pendingOrders, error: pendingOrdersError },
    { data: alertData, error: alertError },
  ] = await Promise.all([
    db.from('report_inventory_valuation')
      .select('product_id, sku, name, quantity_on_hand, reorder_point, cost_price, selling_price')
      .eq('company_id', companyId)
      .order('name', { ascending: true }),
    db.from('report_stock_movements')
      .select('transaction_id, created_at, transaction_type, quantity_change, product_id, sku, product_name, performer_name')
      .eq('company_id', companyId)
      .gte('created_at', thirtyDaysAgoIso)
      .lte('created_at', nowIso)
      .order('created_at', { ascending: false }),
    db.from('purchase_orders')
      .select('id', { count: 'exact', head: true })
      .eq('company_id', companyId)
      .in('status', pendingStatuses),
    db.from('alert_events')
      .select('alert_type, severity, status')
      .eq('company_id', companyId)
      .eq('status', 'open'),
  ])

  if (valuationError) throw valuationError
  if (movementError) throw movementError
  if (pendingOrdersError) throw pendingOrdersError
  if (alertError) throw alertError

  const valuationRows = ((valuationData ?? []) as ReportValuationRpcRow[])
  const movementRows = ((movementData ?? []) as ReportStockMovementRpcRow[])
  const openAlerts = (alertData ?? []) as Array<{ alert_type: string | null; severity: string | null; status: string | null }>

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

  const totalValue = products.reduce((sum, product) => sum + product.quantity_on_hand * product.cost_price, 0)
  const totalStockUnits = products.reduce((sum, product) => sum + product.quantity_on_hand, 0)
  const lowStockCount = products.filter((product) => product.quantity_on_hand <= product.reorder_point).length
  const outOfStockCount = products.filter((product) => product.quantity_on_hand <= 0).length
  const deltaByDay = movementRows.reduce((acc, row) => {
    const day = String(row.created_at).slice(0, 10)
    acc.set(day, (acc.get(day) ?? 0) + toNumber(row.quantity_change, 0))
    return acc
  }, new Map<string, number>())
  const days = Array.from({ length: 30 }, (_, index) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - index))
    return date.toISOString().slice(0, 10)
  })
  const totalDelta = days.reduce((sum, day) => sum + (deltaByDay.get(day) ?? 0), 0)
  let runningValue = totalValue - totalDelta

  const chartData = days
    .map((day) => {
      runningValue += deltaByDay.get(day) ?? 0
      return {
        date: day,
        value: runningValue,
      }
    })

  const usageByDay = movementRows.reduce((acc, row) => {
    const normalizedType = normalizeTransactionType(row.transaction_type)
    if (normalizedType !== 'sale' && normalizedType !== 'loss') return acc
    const day = String(row.created_at).slice(0, 10)
    acc.set(day, (acc.get(day) ?? 0) + Math.abs(toNumber(row.quantity_change, 0)))
    return acc
  }, new Map<string, number>())

  const usageChartData = days.map((day) => ({
    date: day,
    value: usageByDay.get(day) ?? 0,
  }))

  const movementChartData = Array.from(
    movementRows.reduce((acc, row) => {
      const date = String(row.created_at).slice(0, 10)
      const entry = acc.get(date) ?? { date, inbound: 0, outbound: 0 }
      const quantityChange = toNumber(row.quantity_change, 0)
      const quantity = Math.abs(quantityChange)
      const normalizedType = normalizeTransactionType(row.transaction_type)

      if (normalizedType === 'purchase' || normalizedType === 'return' || quantityChange > 0) {
        entry.inbound += quantity
      } else {
        entry.outbound += quantity
      }

      acc.set(date, entry)
      return acc
    }, new Map<string, { date: string; inbound: number; outbound: number }>()).values(),
  )
    .sort((left, right) => left.date.localeCompare(right.date))
    .slice(-30)

  return {
    products,
    transactions,
    revenue30Days,
    totalValue,
    totalStockUnits,
    pendingOrders: pendingOrders ?? 0,
    lowStockCount,
    outOfStockCount,
    topMovers,
    chartData,
    usageChartData,
    movementChartData,
    alertsSummary: {
      openAlerts: openAlerts.length,
      criticalAlerts: openAlerts.filter((alert) => alert.severity === 'critical').length,
      lowStockAlerts: openAlerts.filter((alert) => alert.alert_type === 'low_stock').length,
      reorderAlerts: openAlerts.filter((alert) => alert.alert_type === 'reorder_point').length,
      expirationAlerts: openAlerts.filter((alert) => alert.alert_type === 'expiration').length,
    },
  }
}
