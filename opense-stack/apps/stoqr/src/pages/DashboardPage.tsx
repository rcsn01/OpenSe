import { useEffect, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase, db } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { toNumber } from '../utils'
import { RecentActivity } from '../components/Dashboard/RecentActivity'
import { StatsCards } from '../components/Dashboard/StatsCards'
import { StockHealth } from '../components/Dashboard/StockHealth'
import { TopMovers } from '../components/Dashboard/TopMovers'
import { ValuationChart } from '../components/Dashboard/ValuationChart'
import type { TopMover, TransactionSummary } from '../components/Dashboard/types'

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

// --- Main Component ---

export const DashboardPage = () => {
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

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading || !data}
      emptyStateTitle="Welcome to Fill The Shelf"
      emptyStateDescription="Select or create a company to get started."
      loadingMessage="Loading dashboard..."
    >
      {data && (
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
      <StatsCards
        revenue30Days={data.revenue30Days}
        totalValue={data.totalValue}
        totalProducts={data.products.length}
        lowStockCount={data.lowStockCount}
        outOfStockCount={data.outOfStockCount}
      />

      <div className="grid grid-2">
        {/* Valuation Chart */}
        <ValuationChart chartData={data.chartData} />

        {/* Stock Health & Top Movers */}
        <StockHealth
          totalProducts={data.products.length}
          lowStockCount={data.lowStockCount}
          outOfStockCount={data.outOfStockCount}
        />
      </div>

      <div className="grid grid-2">
        {/* Top Selling Products */}
        <TopMovers topMovers={data.topMovers} />

        {/* Recent Activity */}
        <RecentActivity transactions={data.transactions} />
      </div>
      </div>
      )}
    </BasePage>
  )
}