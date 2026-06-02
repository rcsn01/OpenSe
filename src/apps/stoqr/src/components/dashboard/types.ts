export type TransactionSummary = {
  id: string
  transaction_type: 'purchase' | 'sale' | 'return' | 'adjustment' | 'loss'
  quantity_change: number
  created_at: string
  products: { name: string; sku: string } | null
  profiles: { full_name: string | null; username: string | null } | null
}

export type TopMover = {
  id: string
  name: string
  sku: string
  totalSold: number
  revenue: number
}
