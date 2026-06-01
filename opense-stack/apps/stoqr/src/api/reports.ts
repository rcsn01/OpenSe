import { db } from '../supabaseClient'

type ReportProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  cost_price: number | null
  selling_price: number | null
}

type ReportTransaction = {
  id: string
  transaction_type: string
  quantity_change: number
  created_at: string
  notes: string | null
  performed_by: string | null
  products: { id: string; name: string; sku: string; cost_price: number | null; selling_price: number | null } | null
  profiles: { id: string | null; full_name: string | null; username: string | null } | null
}

export type AuditShrinkageDiscrepancy = {
  id: string
  transaction_type: string
  source: string | null
  quantity_change: number
  stock_after: number
  created_at: string
  notes: string | null
  products: { id: string; name: string; sku: string; cost_price: number | null; selling_price: number | null } | null
}

export type AuditShrinkageSale = {
  id: string
  quantity_change: number
  created_at: string
  products: { selling_price: number | null } | null
}

type ReportValuationRpcRow = {
  product_id: string
  sku: string
  name: string
  quantity_on_hand: number | string | null
  cost_price: number | string | null
  selling_price: number | string | null
}

type ReportStockMovementRpcRow = {
  transaction_id: string
  created_at: string
  transaction_type: string
  quantity_change: number | string
  notes: string | null
  performed_by: string | null
  performer_name: string | null
  product_id: string | null
  sku: string | null
  product_name: string | null
}

type AuditShrinkageDiscrepancyRow = {
  id: string
  transaction_type: string
  source: string | null
  quantity_change: number | string
  stock_after: number | string | null
  created_at: string
  notes: string | null
  products:
    | { id: string; name: string; sku: string; cost_price: number | string | null; selling_price: number | string | null }
    | Array<{ id: string; name: string; sku: string; cost_price: number | string | null; selling_price: number | string | null }>
    | null
}

type AuditShrinkageSaleRow = {
  id: string
  quantity_change: number | string
  created_at: string
  products:
    | { selling_price: number | string | null }
    | Array<{ selling_price: number | string | null }>
    | null
}

const DAYS = 30
const formatDay = (date: Date) => date.toISOString().split('T')[0]

const toNumber = (value: unknown, fallback = 0) => {
  if (typeof value === 'number' && Number.isFinite(value)) return value
  if (typeof value === 'string') {
    const parsed = Number(value)
    if (Number.isFinite(parsed)) return parsed
  }
  return fallback
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const buildSeries = (currentValue: number, deltasByDay: Record<string, number>) => {
  const series: { date: string; value: number }[] = []
  const today = new Date()
  const days: string[] = []

  for (let index = DAYS - 1; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - index)
    days.push(formatDay(date))
  }

  const totalDelta = days.reduce((sum, day) => sum + (deltasByDay[day] ?? 0), 0)
  let running = currentValue - totalDelta

  days.forEach((day) => {
    running += deltasByDay[day] ?? 0
    series.push({ date: day, value: running })
  })

  return series
}

export const fetchReportsData = async (companyId: string) => {
  const startIso = new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()
  const endIso = new Date().toISOString()

  const [{ data: valuationData, error: valuationError }, { data: movementData, error: movementError }, { data: schedulesData, error: schedulesError }] = await Promise.all([
    db.from('report_inventory_valuation')
      .select('product_id, sku, name, quantity_on_hand, cost_price, selling_price')
      .eq('company_id', companyId)
      .order('name', { ascending: true }),
    db.from('report_stock_movements')
      .select('transaction_id, created_at, transaction_type, quantity_change, notes, performed_by, performer_name, product_id, sku, product_name')
      .eq('company_id', companyId)
      .gte('created_at', startIso)
      .lte('created_at', endIso)
      .order('created_at', { ascending: false }),
    db.from('report_schedules').select('*').eq('company_id', companyId),
  ])

  if (valuationError) throw valuationError
  if (movementError) throw movementError
  if (schedulesError) throw schedulesError

  const valuationRows = (valuationData as ReportValuationRpcRow[] | null) ?? []
  const movementRows = (movementData as ReportStockMovementRpcRow[] | null) ?? []

  const products: ReportProduct[] = valuationRows.map((row) => ({
    id: row.product_id,
    name: row.name,
    sku: row.sku,
    quantity_on_hand: toNumber(row.quantity_on_hand, 0),
    cost_price: toNumber(row.cost_price, 0),
    selling_price: toNumber(row.selling_price, 0),
  }))

  const productsById = new Map(
    products.map((product) => [product.id, product]),
  )

  const transactions: ReportTransaction[] = movementRows.map((row) => {
    const product = row.product_id ? productsById.get(row.product_id) : undefined
    return {
      id: row.transaction_id,
      transaction_type: row.transaction_type,
      quantity_change: toNumber(row.quantity_change, 0),
      created_at: row.created_at,
      notes: row.notes,
      performed_by: row.performed_by,
      products: row.product_id
        ? {
            id: row.product_id,
            name: row.product_name ?? product?.name ?? 'Unknown Product',
            sku: row.sku ?? product?.sku ?? 'N/A',
            cost_price: product?.cost_price ?? null,
            selling_price: product?.selling_price ?? null,
          }
        : null,
      profiles: {
        id: row.performed_by,
        full_name: row.performer_name,
        username: null,
      },
    }
  })

  const currentValue = products.reduce(
    (sum, product) => sum + (product.quantity_on_hand ?? 0) * (product.cost_price ?? 0),
    0,
  )

  const deltasByDay: Record<string, number> = {}
  transactions.forEach((transaction) => {
    const day = formatDay(new Date(transaction.created_at))
    const val = (transaction.quantity_change ?? 0) * toNumber(transaction.products?.cost_price ?? 0)
    deltasByDay[day] = (deltasByDay[day] ?? 0) + val
  })

  return {
    products,
    transactions,
    schedules: schedulesData ?? [],
    series: buildSeries(currentValue, deltasByDay),
  }
}

export const fetchAuditShrinkageData = async (companyId: string) => {
  const yearStart = new Date(new Date().getFullYear(), 0, 1).toISOString()

  const [
    { data: discrepancyData, error: discrepancyError },
    { data: salesData, error: salesError },
  ] = await Promise.all([
    db
      .from('inventory_transactions')
      .select(`
        id,
        transaction_type,
        source,
        quantity_change,
        stock_after,
        created_at,
        notes,
        products(id, name, sku, cost_price, selling_price)
      `)
      .eq('company_id', companyId)
      .in('transaction_type', ['adjustment', 'loss'])
      .gte('created_at', yearStart)
      .order('created_at', { ascending: false }),
    db
      .from('inventory_transactions')
      .select(`
        id,
        quantity_change,
        created_at,
        products(selling_price)
      `)
      .eq('company_id', companyId)
      .eq('transaction_type', 'sale')
      .gte('created_at', yearStart)
      .order('created_at', { ascending: false }),
  ])

  if (discrepancyError) throw discrepancyError
  if (salesError) throw salesError

  const discrepancies = ((discrepancyData as AuditShrinkageDiscrepancyRow[] | null) ?? []).map((row) => {
    const product = normalizeSingle(row.products)

    return {
      id: row.id,
      transaction_type: row.transaction_type,
      source: row.source,
      quantity_change: toNumber(row.quantity_change, 0),
      stock_after: toNumber(row.stock_after, 0),
      created_at: row.created_at,
      notes: row.notes,
      products: product
        ? {
            id: product.id,
            name: product.name,
            sku: product.sku,
            cost_price: toNumber(product.cost_price, 0),
            selling_price: toNumber(product.selling_price, 0),
          }
        : null,
    }
  }) satisfies AuditShrinkageDiscrepancy[]

  const sales = ((salesData as AuditShrinkageSaleRow[] | null) ?? []).map((row) => {
    const product = normalizeSingle(row.products)

    return {
      id: row.id,
      quantity_change: toNumber(row.quantity_change, 0),
      created_at: row.created_at,
      products: product
        ? {
            selling_price: toNumber(product.selling_price, 0),
          }
        : null,
    }
  }) satisfies AuditShrinkageSale[]

  return {
    discrepancies,
    sales,
  }
}
