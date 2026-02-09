import { useEffect, useMemo, useState } from 'react'
import { db } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { AuditTrailTab } from '../components/Reports/AuditTrailTab'
import { ProfitabilityTab } from '../components/Reports/ProfitabilityTab'
import { TurnoverTab } from '../components/Reports/TurnoverTab'
import { ValuationTab } from '../components/Reports/ValuationTab'

const DAYS = 30

const formatDay = (date: Date) => date.toISOString().split('T')[0]

const buildSeries = (currentValue: number, deltasByDay: Record<string, number>) => {
  const series: { date: string; value: number }[] = []
  let startValue = currentValue
  const today = new Date()
  const days: string[] = []
  for (let i = DAYS - 1; i >= 0; i -= 1) {
    const d = new Date(today)
    d.setDate(d.getDate() - i)
    days.push(formatDay(d))
  }

  const totalDelta = days.reduce((sum, day) => sum + (deltasByDay[day] ?? 0), 0)
  startValue = currentValue - totalDelta

  let running = startValue
  days.forEach((day) => {
    running += deltasByDay[day] ?? 0
    series.push({ date: day, value: running })
  })

  return series
}

export const Reports = () => {
  const { companyId } = useCompany()
  const [isLoading, setIsLoading] = useState(true)
  
  // Data State
  const [products, setProducts] = useState<any[]>([])
  const [transactions, setTransactions] = useState<any[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [series, setSeries] = useState<{ date: string; value: number }[]>([])

  const loadData = async () => {
    if (!companyId) return
    setIsLoading(true)

    const [{ data: productData }, { data: transactionData }, { data: scheduleData }] = await Promise.all([
      db.from('products').select('id, name, sku, quantity_on_hand, cost_price, selling_price, category').eq('company_id', companyId),
      db.from('inventory_transactions').select(`
        id, transaction_type, quantity_change, created_at, notes,
        products (id, name, sku, cost_price, selling_price, category),
        profiles (full_name, username)
      `).eq('company_id', companyId).gte('created_at', new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }),
      db.from('report_schedules').select('*').eq('company_id', companyId),
    ])

    const prods = (productData ?? []) as any[]
    const trans = (transactionData ?? []) as any[]

    // Calculate Valuation Series
    const currentValue = prods.reduce((sum, p) => sum + (p.quantity_on_hand ?? 0) * (p.cost_price ?? 0), 0)
    const deltasByDay: Record<string, number> = {}
    trans.forEach((t) => {
      const day = formatDay(new Date(t.created_at))
      const p = Array.isArray(t.products) ? t.products[0] : t.products
      const val = (t.quantity_change ?? 0) * (p?.cost_price ?? 0)
      deltasByDay[day] = (deltasByDay[day] ?? 0) + val
    })

    setProducts(prods)
    setTransactions(trans)
    setSchedules(scheduleData ?? [])
    setSeries(buildSeries(currentValue, deltasByDay))
    setIsLoading(false)
  }

  useEffect(() => { loadData() }, [companyId])

  // Avg Inventory Value for Turnover Calculation
  const avgValue = useMemo(() => {
    if (series.length === 0) return 0
    const sum = series.reduce((acc, s) => acc + s.value, 0)
    return sum / series.length
  }, [series])

  return (
    <BasePage companyId={companyId} isLoading={isLoading}>
      <Tabs
      tabs={[
        {
          id: 'valuation',
          label: 'Inventory Valuation',
          content: <ValuationTab series={series} schedules={schedules} companyId={companyId!} onScheduleChange={loadData} />,
        },
        {
          id: 'profit',
          label: 'COGS & Profitability',
          content: <ProfitabilityTab transactions={transactions} />,
        },
        {
          id: 'turnover',
          label: 'Inventory Turnover',
          content: <TurnoverTab transactions={transactions} products={products} avgInventoryValue={avgValue} />,
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          content: <AuditTrailTab transactions={transactions} />,
        },
      ]}
      />
    </BasePage>
  )
}