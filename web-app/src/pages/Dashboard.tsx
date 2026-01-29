import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import { MetricCard } from '../components/MetricCard'
import { SimpleLineChart } from '../components/SimpleLineChart'
import { ProgressBar } from '../components/ProgressBar'
import { formatCurrency, formatDateTime, toNumber } from '../utils'

// --- Types ---

type DashboardData = {
  products: ProductSummary[]
  transactions: TransactionSummary[]
  revenue30Days: number
  totalValue: number
  lowStockCount: number
  outOfStockCount: number
  topMovers: TopMover[]
  chartData: { date: string; value: number }[]
}

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

// --- Main Component ---

export const Dashboard = () => {
  const { companyId } = useCompany()
  const [data, setData] = useState<DashboardData | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadDashboardData = async () => {
      if (!companyId) return
      setIsLoading(true)

      const thirtyDaysAgo = new Date()
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

      // 1. Fetch Products for Stock Status & Current Valuation
      const { data: productsData } = await supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, reorder_point, cost_price, selling_price')
        .eq('company_id', companyId)

      const products = (productsData as ProductSummary[] | null) ?? []

      // 2. Fetch Recent Transactions for Activity, Revenue, and Charting
      const { data: transData } = await supabase
        .from('inventory_transactions')
        .select(`
          id, transaction_type, quantity_change, created_at,
          products (name, sku),
          profiles (full_name, username)
        `)
        .eq('company_id', companyId)
        .gte('created_at', thirtyDaysAgo.toISOString())
        .order('created_at', { ascending: false })

      const transactionsRaw = (transData as any[]) ?? []
      
      // Normalize transactions
      const transactions: TransactionSummary[] = transactionsRaw.map(t => ({
        ...t,
        products: Array.isArray(t.products) ? t.products[0] : t.products,
        profiles: Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
      }))

      // --- Calculations ---

      // A. Inventory Value & Stock Counts
      let totalValue = 0
      let lowStockCount = 0
      let outOfStockCount = 0

      products.forEach(p => {
        const qty = toNumber(p.quantity_on_hand)
        const cost = toNumber(p.cost_price)
        const reorder = toNumber(p.reorder_point)

        totalValue += qty * cost
        if (qty === 0) outOfStockCount++
        else if (qty <= reorder) lowStockCount++
      })

      // B. Sales Revenue (Last 30 Days)
      let revenue30Days = 0
      
      const productPriceMap = new Map(products.map(p => [p.name + p.sku, toNumber(p.selling_price)])) 
      const productIdMap = new Map(products.map(p => [p.name + p.sku, p.id])) 

      const topMoversMap: Record<string, TopMover> = {}

      transactions.forEach(t => {
        if (t.transaction_type === 'sale') {
          const pRef = t.products
          if (!pRef) return
          
          const key = pRef.name + pRef.sku
          const price = productPriceMap.get(key) || 0
          const qtySold = Math.abs(t.quantity_change)
          const txRevenue = qtySold * price

          revenue30Days += txRevenue

          const pId = productIdMap.get(key) ?? 'unknown'
          
          if (!topMoversMap[key]) {
            topMoversMap[key] = { id: pId, name: pRef.name, sku: pRef.sku, totalSold: 0, revenue: 0 }
          }
          topMoversMap[key].totalSold += qtySold
          topMoversMap[key].revenue += txRevenue
        }
      })

      // C. Chart Data (Inventory Value History - Simplified)
      const chartPoints: { date: string; value: number }[] = []
      const daysMap: Record<string, number> = {} // Net change in value per day

      transactionsRaw.forEach(t => {
        const day = t.created_at.split('T')[0]
        const pRef = products.find(p => p.name === (t.products?.name))
        const cost = pRef ? toNumber(pRef.cost_price) : 0
        const changeVal = t.quantity_change * cost
        
        daysMap[day] = (daysMap[day] || 0) + changeVal
      })

      let runningValue = totalValue
      // Generate last 14 days for the sparkline
      for (let i = 0; i < 14; i++) {
        const d = new Date()
        d.setDate(d.getDate() - i) // Corrected date logic
        const dayStr = d.toISOString().split('T')[0]
        
        chartPoints.unshift({ date: dayStr, value: runningValue })
        // Subtract today's change to get yesterday's end value
        runningValue -= (daysMap[dayStr] || 0)
      }

      setData({
        products,
        transactions: transactions.slice(0, 7), // Recent 7
        revenue30Days,
        totalValue,
        lowStockCount,
        outOfStockCount,
        topMovers: Object.values(topMoversMap).sort((a, b) => b.revenue - a.revenue).slice(0, 5),
        chartData: chartPoints
      })
      setIsLoading(false)
    }

    loadDashboardData()
  }, [companyId])

  if (!companyId) {
    return <EmptyState title="Welcome to Fill The Shelf" description="Select or create a company to get started." />
  }

  if (isLoading || !data) {
    return <div className="empty-state">Loading dashboard...</div>
  }

  return (
    <div className="stack">
      {/* Quick Actions */}
      <div className="flex-between">
        <h2 className="section-title" style={{ margin: 0 }}>Overview</h2>
        <div className="row">
          <Link to="/inventory" className="button secondary small">Add Product</Link>
          <Link to="/scan" className="button small">Scan Item</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
        <MetricCard 
          title="Revenue (30d)" 
          value={formatCurrency(data.revenue30Days)} 
          subtext="Sales from tracked items" 
        />
        <MetricCard 
          title="Inventory Value" 
          value={formatCurrency(data.totalValue)} 
          subtext={`${data.products.length} total SKUs`} 
        />
        <div className="card stat" style={{ borderLeft: '4px solid var(--warning)' }}>
          <h3>Low Stock</h3>
          <div className="value">{data.lowStockCount}</div>
          <div className="muted small">Items below reorder point</div>
        </div>
        <div className="card stat" style={{ borderLeft: '4px solid var(--danger)' }}>
          <h3>Out of Stock</h3>
          <div className="value">{data.outOfStockCount}</div>
          <div className="muted small">Items with 0 quantity</div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Valuation Chart */}
        <div className="card stack">
          <div className="flex-between">
            <h3 className="section-title">Valuation Trend (14d)</h3>
            <span className="badge success">Live</span>
          </div>
          <div className="muted small">Net inventory value based on cost price over time.</div>
          <SimpleLineChart data={data.chartData} />
        </div>

        {/* Stock Health & Top Movers */}
        <div className="card stack">
          <h3 className="section-title">Stock Health</h3>
          <div style={{ marginTop: 8 }}>
            <ProgressBar 
              label="Healthy Stock" 
              value={data.products.length - data.lowStockCount - data.outOfStockCount} 
              max={data.products.length} 
              color="var(--success)" 
            />
            <ProgressBar 
              label="Low Stock" 
              value={data.lowStockCount} 
              max={data.products.length} 
              color="var(--warning)" 
            />
            <ProgressBar 
              label="Out of Stock" 
              value={data.outOfStockCount} 
              max={data.products.length} 
              color="var(--danger)" 
            />
          </div>
        </div>
      </div>

      <div className="grid grid-2">
        {/* Top Selling Products */}
        <div className="card stack">
          <h3 className="section-title">Top Movers (30d)</h3>
          {data.topMovers.length === 0 ? (
            <EmptyState title="No sales data" description="Record sales to see top performers." />
          ) : (
            <div className="list">
              {data.topMovers.map((item) => (
                <div key={item.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div className="small muted">SKU: {item.sku}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600 }}>{formatCurrency(item.revenue)}</div>
                    <div className="small muted">{item.totalSold} sold</div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Recent Activity */}
        <div className="card stack">
          <div className="flex-between">
            <h3 className="section-title">Recent Activity</h3>
            <Link to="/inventory" className="small muted">View all</Link>
          </div>
          {data.transactions.length === 0 ? (
            <EmptyState title="No activity" description="Recent inventory movements will appear here." />
          ) : (
            <div className="timeline">
              {data.transactions.map((t) => (
                <div key={t.id} className="timeline-item">
                  <div className="flex-between">
                    <div>
                      <span style={{ fontWeight: 500 }}>
                        {t.products?.name ?? 'Unknown Product'}
                      </span>
                      <span className="muted"> &middot; {t.transaction_type}</span>
                    </div>
                    <span className={`badge ${t.quantity_change > 0 ? 'success' : 'neutral'}`}>
                      {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                    </span>
                  </div>
                  <div className="small muted" style={{ marginTop: 4 }}>
                    {formatDateTime(t.created_at)} by {t.profiles?.full_name ?? t.profiles?.username ?? 'System'}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}