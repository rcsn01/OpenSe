import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { InventoryTransaction } from '../types'
import { formatCurrency, formatDateTime, toNumber } from '../utils'
import { EmptyState } from '../components/EmptyState'

type ProductSummary = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  reorder_point: number
  cost_price: number | null
  selling_price: number | null
}

type TransactionSummary = InventoryTransaction & {
  products?: { id: string; name: string; sku: string } | { id: string; name: string; sku: string }[]
  profiles?: { id: string; full_name: string | null; username: string | null } | {
    id: string
    full_name: string | null
    username: string | null
  }[]
}

export const Dashboard = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<ProductSummary[]>([])
  const [transactions, setTransactions] = useState<TransactionSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!companyId) return
      setIsLoading(true)

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(
          'id, name, sku, quantity_on_hand, reorder_point, cost_price, selling_price, created_at',
        )
        .eq('company_id', companyId)

      if (productError) {
        console.error(productError)
      }

      const { data: transactionData, error: transactionError } = await supabase
        .from('inventory_transactions')
        .select(
          'id, transaction_type, quantity_change, stock_after, created_at, products (id, name, sku), profiles (id, full_name, username)',
        )
        .eq('company_id', companyId)
        .order('created_at', { ascending: false })
        .limit(8)

      if (transactionError) {
        console.error(transactionError)
      }

      setProducts((productData as ProductSummary[]) ?? [])
      setTransactions((transactionData as TransactionSummary[]) ?? [])
      setIsLoading(false)
    }

    load()
  }, [companyId])

  const totalItems = products.length
  const totalValue = useMemo(() => {
    return products.reduce((sum, product) => {
      return sum + toNumber(product.quantity_on_hand) * toNumber(product.cost_price)
    }, 0)
  }, [products])

  const lowStock = products.filter((product) => product.quantity_on_hand <= product.reorder_point)

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to load data." />
  }

  return (
    <div className="stack">
      <div className="grid grid-3">
        <div className="card stat">
          <h3>Total items</h3>
          <div className="value">{isLoading ? '—' : totalItems}</div>
          <div className="muted small">Products currently tracked</div>
        </div>
        <div className="card stat">
          <h3>Total inventory value</h3>
          <div className="value">{isLoading ? '—' : formatCurrency(totalValue)}</div>
          <div className="muted small">Based on cost price</div>
        </div>
        <div className="card stat">
          <h3>Low stock</h3>
          <div className="value">{isLoading ? '—' : lowStock.length}</div>
          <div className="muted small">Items at or below reorder point</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h3 className="section-title">Low stock alerts</h3>
            <span className="pill">{lowStock.length} items</span>
          </div>
          {lowStock.length === 0 ? (
            <EmptyState title="All good" description="No low stock items right now." />
          ) : (
            <div className="list">
              {lowStock.slice(0, 6).map((product) => (
                <div key={product.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="small muted">SKU {product.sku}</div>
                  </div>
                  <span className="badge warning">{product.quantity_on_hand} left</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <div className="flex-between" style={{ marginBottom: 12 }}>
            <h3 className="section-title">Recent activity</h3>
            <span className="pill">Last 8 updates</span>
          </div>
          {transactions.length === 0 ? (
            <EmptyState title="No activity" description="Inventory updates will appear here." />
          ) : (
            <div className="timeline">
              {transactions.map((transaction) => {
                const productRef = Array.isArray(transaction.products)
                  ? transaction.products[0]
                  : transaction.products
                const profileRef = Array.isArray(transaction.profiles)
                  ? transaction.profiles[0]
                  : transaction.profiles

                return (
                  <div key={transaction.id} className="timeline-item">
                    <div className="flex-between">
                      <div>
                        <div style={{ fontWeight: 600 }}>{productRef?.name ?? '—'}</div>
                        <div className="small muted">
                          {transaction.transaction_type} · {productRef?.sku ?? ''}
                        </div>
                      </div>
                      <span className="badge success">
                        {transaction.quantity_change > 0 ? '+' : ''}
                        {transaction.quantity_change}
                      </span>
                    </div>
                    <div className="small muted" style={{ marginTop: 6 }}>
                      {formatDateTime(transaction.created_at)} ·{' '}
                      {profileRef?.full_name ?? profileRef?.username ?? 'Unknown'}
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
