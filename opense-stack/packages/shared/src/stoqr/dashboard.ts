export type DashboardTransactionType = 'purchase' | 'sale' | 'return' | 'adjustment' | 'loss'

export type DashboardProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number | string | null
  reorder_point: number | string | null
  cost_price: number | string | null
  selling_price: number | string | null
}

type DashboardProductRef = {
  name: string
  sku: string
}

type DashboardActorRef = {
  full_name: string | null
  username: string | null
}

export type DashboardTransactionRaw = {
  id: string
  transaction_type: DashboardTransactionType
  quantity_change: number
  created_at: string
  products: DashboardProductRef | DashboardProductRef[] | null
  profiles: DashboardActorRef | DashboardActorRef[] | null
}

export type DashboardTransactionSummary = {
  id: string
  transaction_type: DashboardTransactionType
  quantity_change: number
  created_at: string
  products: DashboardProductRef | null
  profiles: DashboardActorRef | null
}

export type DashboardTopMover = {
  id: string
  name: string
  sku: string
  totalSold: number
  revenue: number
}

export type DashboardMetrics = {
  transactions: DashboardTransactionSummary[]
  revenue30Days: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  topMovers: DashboardTopMover[]
  chartData: { date: string; value: number }[]
}

const toNumber = (value: string | number | null | undefined, fallback = 0): number => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const formatDate = (value: Date) => value.toISOString().split('T')[0]

export const calculateDashboardMetrics = (
  products: DashboardProduct[],
  transactionsRaw: DashboardTransactionRaw[],
  now = new Date(),
): DashboardMetrics => {
  const transactions: DashboardTransactionSummary[] = transactionsRaw.map((transaction) => ({
    id: transaction.id,
    transaction_type: transaction.transaction_type,
    quantity_change: transaction.quantity_change,
    created_at: transaction.created_at,
    products: normalizeSingle(transaction.products),
    profiles: normalizeSingle(transaction.profiles),
  }))

  let totalValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0

  products.forEach((product) => {
    const quantity = toNumber(product.quantity_on_hand)
    const costPrice = toNumber(product.cost_price)
    const reorderPoint = toNumber(product.reorder_point)

    totalValue += quantity * costPrice

    if (quantity === 0) {
      outOfStockCount += 1
    } else if (quantity <= reorderPoint) {
      lowStockCount += 1
    }
  })

  let revenue30Days = 0
  const productKeyToSellingPrice = new Map(products.map((product) => [product.name + product.sku, toNumber(product.selling_price)]))
  const productKeyToId = new Map(products.map((product) => [product.name + product.sku, product.id]))
  const topMoversByProductKey: Record<string, DashboardTopMover> = {}

  transactions.forEach((transaction) => {
    if (transaction.transaction_type !== 'sale') return

    const productReference = transaction.products
    if (!productReference) return

    const productKey = productReference.name + productReference.sku
    const quantitySold = Math.abs(transaction.quantity_change)
    const transactionRevenue = quantitySold * (productKeyToSellingPrice.get(productKey) ?? 0)

    revenue30Days += transactionRevenue

    if (!topMoversByProductKey[productKey]) {
      topMoversByProductKey[productKey] = {
        id: productKeyToId.get(productKey) ?? 'unknown',
        name: productReference.name,
        sku: productReference.sku,
        totalSold: 0,
        revenue: 0,
      }
    }

    topMoversByProductKey[productKey].totalSold += quantitySold
    topMoversByProductKey[productKey].revenue += transactionRevenue
  })

  const dailyNetChangeByDate: Record<string, number> = {}

  transactionsRaw.forEach((transaction) => {
    const day = transaction.created_at.split('T')[0]
    const productReference = normalizeSingle(transaction.products)
    const product = products.find((item) => item.name === productReference?.name)
    const costPrice = product ? toNumber(product.cost_price) : 0
    const valueChange = transaction.quantity_change * costPrice

    dailyNetChangeByDate[day] = (dailyNetChangeByDate[day] ?? 0) + valueChange
  })

  const chartData: { date: string; value: number }[] = []
  let runningValue = totalValue

  for (let index = 0; index < 14; index += 1) {
    const date = new Date(now)
    date.setDate(now.getDate() - index)
    const day = formatDate(date)

    chartData.unshift({ date: day, value: runningValue })
    runningValue -= dailyNetChangeByDate[day] ?? 0
  }

  return {
    transactions,
    revenue30Days,
    totalValue,
    lowStockCount,
    outOfStockCount,
    topMovers: Object.values(topMoversByProductKey)
      .sort((left, right) => right.revenue - left.revenue)
      .slice(0, 5),
    chartData,
  }
}
