import { db, supabase } from '../supabaseClient'

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
    supabase.rpc('get_stoqr_report_inventory_valuation', { target_company_id: companyId }),
    supabase.rpc('get_stoqr_report_stock_movements', {
      target_company_id: companyId,
      p_start: startIso,
      p_end: endIso,
    }),
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
