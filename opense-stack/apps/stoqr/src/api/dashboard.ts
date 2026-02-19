import {
  calculateDashboardMetrics,
  type DashboardTopMover as TopMover,
  type DashboardTransactionRaw,
  type DashboardTransactionSummary as TransactionSummary,
} from '@repo/shared/stoqr/dashboard'
import { db, supabase } from '../supabaseClient'

type ProductSummary = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  reorder_point: number
  cost_price: number
  selling_price: number
}

type DashboardTransactionRow = {
  id: string
  transaction_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'loss'
  quantity_change: number
  created_at: string
  product_id: string | null
  performed_by: string | null
}

type ProfileLookup = {
  id: string
  full_name: string | null
  username: string | null
}

export type DashboardData = {
  products: ProductSummary[]
  transactions: TransactionSummary[]
  revenue30Days: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  topMovers: TopMover[]
  chartData: { date: string; value: number }[]
}

export const fetchDashboardData = async (companyId: string): Promise<DashboardData> => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const [{ data: productsData, error: productsError }, { data: transactionsData, error: transactionsError }] = await Promise.all([
    db
      .from('products')
      .select('id, name, sku, quantity_on_hand, reorder_point, cost_price, selling_price')
      .eq('company_id', companyId),
    db
      .from('inventory_transactions')
      .select('id, transaction_type, quantity_change, created_at, product_id, performed_by')
      .eq('company_id', companyId)
      .gte('created_at', thirtyDaysAgo.toISOString())
      .order('created_at', { ascending: false }),
  ])

  if (productsError) throw productsError
  if (transactionsError) throw transactionsError

  const products = (productsData ?? []) as ProductSummary[]
  const transactionRows = (transactionsData ?? []) as DashboardTransactionRow[]

  const profileIds = Array.from(
    new Set(transactionRows.map((row) => row.performed_by).filter((value): value is string => !!value)),
  )

  const productsById = new Map(
    products.map((item) => [item.id, { id: item.id, name: item.name, sku: item.sku }]),
  )

  const { data: profileRows, error: profileLookupError } = profileIds.length
    ? await supabase
        .from('profiles')
        .select('id, full_name, username')
        .in('id', profileIds)
    : { data: [] as ProfileLookup[], error: null }

  if (profileLookupError) {
    console.warn('Dashboard profile enrichment failed', profileLookupError)
  }

  const profilesById = new Map(
    ((profileRows ?? []) as ProfileLookup[]).map((item) => [item.id, item]),
  )

  const transactionsRaw: DashboardTransactionRaw[] = transactionRows.map((row) => ({
    id: row.id,
    transaction_type: row.transaction_type,
    quantity_change: row.quantity_change,
    created_at: row.created_at,
    products: row.product_id ? productsById.get(row.product_id) ?? null : null,
    profiles: row.performed_by ? profilesById.get(row.performed_by) ?? null : null,
  }))

  const metrics = calculateDashboardMetrics(products, transactionsRaw)

  return {
    products,
    transactions: metrics.transactions.slice(0, 7),
    revenue30Days: metrics.revenue30Days,
    totalValue: metrics.totalValue,
    lowStockCount: metrics.lowStockCount,
    outOfStockCount: metrics.outOfStockCount,
    topMovers: metrics.topMovers,
    chartData: metrics.chartData,
  }
}
