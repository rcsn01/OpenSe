import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { formatCurrency, formatDateTime, toNumber } from '../utils'

const DAYS = 30

const formatDay = (date: Date) => date.toISOString().split('T')[0]

// --- Helper: Build Valuation Series ---
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

// --- Tab 1: Valuation View (Existing Logic) ---
const ValuationView = ({ 
  series, 
  schedules, 
  companyId, 
  onScheduleChange 
}: { 
  series: { date: string; value: number }[]
  schedules: any[]
  companyId: string
  onScheduleChange: () => void
}) => {
  const [newSchedule, setNewSchedule] = useState({
    report_type: 'stock_valuation',
    cadence: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    time_of_day: '09:00',
    recipients: '',
  })
  const [message, setMessage] = useState<string | null>(null)

  const handleCreateSchedule = async () => {
    setMessage(null)
    const { error } = await supabase.from('report_schedules').insert({
      company_id: companyId,
      report_type: newSchedule.report_type,
      cadence: newSchedule.cadence,
      day_of_week: newSchedule.cadence === 'weekly' ? newSchedule.day_of_week : null,
      day_of_month: newSchedule.cadence === 'monthly' ? newSchedule.day_of_month : null,
      time_of_day: newSchedule.time_of_day,
      recipients: newSchedule.recipients.split(',').map((e) => e.trim()).filter(Boolean),
    })

    setMessage(error ? error.message : 'Schedule saved.')
    if (!error) {
      setNewSchedule((prev) => ({ ...prev, recipients: '' }))
      onScheduleChange()
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    await supabase.from('report_schedules').delete().eq('id', id)
    onScheduleChange()
  }

  const maxValue = Math.max(...series.map((point) => point.value), 1)
  const chartPath = useMemo(() => {
    if (series.length === 0) return ''
    return series
      .map((point, index) => {
        const x = (index / (series.length - 1)) * 100
        const y = 100 - (point.value / maxValue) * 100
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`
      })
      .join(' ')
  }, [series, maxValue])

  return (
    <div className="stack">
      <div className="card stack">
        <div className="flex-between">
          <div>
            <h3 className="section-title">Stock Valuation History</h3>
            <div className="muted small">Rolling {DAYS}-day inventory value based on cost price.</div>
          </div>
          <div className="pill">Current: {formatCurrency(series.at(-1)?.value ?? 0)}</div>
        </div>
        {series.length === 0 ? (
          <EmptyState title="No data" description="Create transactions to generate valuation history." />
        ) : (
          <div style={{ width: '100%', height: 240, marginTop: 16 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <path d={chartPath} fill="none" stroke="#2563eb" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={`M 0,100 L ${chartPath} L 100,100 Z`} fill="#2563eb" fillOpacity="0.05" stroke="none" />
            </svg>
          </div>
        )}
      </div>

      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Report Subscriptions</h3>
          <span className="pill">{schedules.length} active</span>
        </div>
        <div className="grid grid-2">
          <div className="stack">
            <label className="stack">
              Report Type
              <select
                className="select"
                value={newSchedule.report_type}
                onChange={(e) => setNewSchedule({ ...newSchedule, report_type: e.target.value })}
              >
                <option value="stock_valuation">Stock Valuation</option>
                <option value="low_stock">Low Stock</option>
                <option value="item_flow">Item Flow</option>
              </select>
            </label>
            <div className="grid grid-2">
               <label className="stack">
                Cadence
                <select
                  className="select"
                  value={newSchedule.cadence}
                  onChange={(e) => setNewSchedule({ ...newSchedule, cadence: e.target.value })}
                >
                  <option value="daily">Daily</option>
                  <option value="weekly">Weekly</option>
                  <option value="monthly">Monthly</option>
                </select>
              </label>
              {newSchedule.cadence === 'weekly' ? (
                <label className="stack">
                  Day
                  <select
                    className="select"
                    value={newSchedule.day_of_week}
                    onChange={(e) => setNewSchedule({ ...newSchedule, day_of_week: Number(e.target.value) })}
                  >
                    <option value={1}>Monday</option>
                    <option value={5}>Friday</option>
                  </select>
                </label>
              ) : (
                 <label className="stack">
                  Time
                  <input
                    className="input"
                    type="time"
                    value={newSchedule.time_of_day}
                    onChange={(e) => setNewSchedule({ ...newSchedule, time_of_day: e.target.value })}
                  />
                </label>
              )}
            </div>
            <label className="stack">
              Recipients
              <input
                className="input"
                placeholder="email@example.com, ..."
                value={newSchedule.recipients}
                onChange={(e) => setNewSchedule({ ...newSchedule, recipients: e.target.value })}
              />
            </label>
            <button className="button" onClick={handleCreateSchedule}>Add Schedule</button>
            {message && <div className="muted small">{message}</div>}
          </div>
          <div className="stack">
             {schedules.length === 0 ? (
                <div className="empty-state small">No active schedules.</div>
             ) : (
                <div className="list">
                  {schedules.map((s) => (
                    <div key={s.id} className="card" style={{ boxShadow: 'none', padding: 12 }}>
                       <div className="flex-between">
                          <div style={{fontWeight: 600}}>{s.report_type.replace('_', ' ')}</div>
                          <button className="button ghost small" onClick={() => handleDeleteSchedule(s.id)}>Remove</button>
                       </div>
                       <div className="small muted">{s.cadence} at {s.time_of_day}</div>
                    </div>
                  ))}
                </div>
             )}
          </div>
        </div>
      </div>
    </div>
  )
}

// --- Tab 2: COGS & Profitability ---
const ProfitabilityView = ({ transactions }: { transactions: any[] }) => {
  // 1. Filter for sales
  // 2. Aggregate by Product and Category
  const stats = useMemo(() => {
    const byProduct: Record<string, { name: string; sku: string; revenue: number; cogs: number; profit: number }> = {}
    const byCategory: Record<string, { revenue: number; cogs: number; profit: number }> = {}

    transactions.forEach(t => {
      if (t.transaction_type !== 'sale') return
      
      const p = Array.isArray(t.products) ? t.products[0] : t.products
      if (!p) return

      const qty = Math.abs(t.quantity_change)
      const revenue = qty * toNumber(p.selling_price)
      const cogs = qty * toNumber(p.cost_price)
      const profit = revenue - cogs
      const category = p.category || 'Uncategorized'

      // Product Aggregation
      if (!byProduct[p.id]) {
        byProduct[p.id] = { name: p.name, sku: p.sku, revenue: 0, cogs: 0, profit: 0 }
      }
      byProduct[p.id].revenue += revenue
      byProduct[p.id].cogs += cogs
      byProduct[p.id].profit += profit

      // Category Aggregation
      if (!byCategory[category]) {
        byCategory[category] = { revenue: 0, cogs: 0, profit: 0 }
      }
      byCategory[category].revenue += revenue
      byCategory[category].cogs += cogs
      byCategory[category].profit += profit
    })

    return {
      products: Object.values(byProduct).sort((a, b) => b.profit - a.profit),
      categories: Object.entries(byCategory)
        .map(([name, val]) => ({ name, ...val }))
        .sort((a, b) => b.profit - a.profit)
    }
  }, [transactions])

  const totalRevenue = stats.products.reduce((acc, curr) => acc + curr.revenue, 0)
  const totalProfit = stats.products.reduce((acc, curr) => acc + curr.profit, 0)
  const margin = totalRevenue ? (totalProfit / totalRevenue) * 100 : 0

  return (
    <div className="stack">
      <div className="grid grid-3">
        <div className="card stat">
           <h3>Total Revenue (30d)</h3>
           <div className="value">{formatCurrency(totalRevenue)}</div>
        </div>
        <div className="card stat">
           <h3>Gross Profit</h3>
           <div className="value">{formatCurrency(totalProfit)}</div>
        </div>
        <div className="card stat">
           <h3>Net Margin</h3>
           <div className="value" style={{ color: margin > 20 ? 'var(--success)' : undefined }}>
             {margin.toFixed(1)}%
           </div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
           <h3 className="section-title">Profit by Category</h3>
           <table className="table">
              <thead>
                <tr>
                   <th>Category</th>
                   <th style={{textAlign: 'right'}}>Revenue</th>
                   <th style={{textAlign: 'right'}}>Margin</th>
                </tr>
              </thead>
              <tbody>
                 {stats.categories.map(c => (
                   <tr key={c.name}>
                     <td>{c.name}</td>
                     <td style={{textAlign: 'right'}}>{formatCurrency(c.revenue)}</td>
                     <td style={{textAlign: 'right'}}>{((c.profit / c.revenue) * 100).toFixed(1)}%</td>
                   </tr>
                 ))}
              </tbody>
           </table>
        </div>
        <div className="card stack">
           <h3 className="section-title">Top Products by Profit</h3>
           <div className="list">
              {stats.products.slice(0, 5).map(p => (
                 <div key={p.sku} className="flex-between">
                    <div>
                       <div style={{fontWeight: 600}}>{p.name}</div>
                       <div className="small muted">{p.sku}</div>
                    </div>
                    <div style={{textAlign: 'right'}}>
                       <div style={{fontWeight: 600}}>{formatCurrency(p.profit)}</div>
                       <div className="small muted">COGS: {formatCurrency(p.cogs)}</div>
                    </div>
                 </div>
              ))}
           </div>
        </div>
      </div>
    </div>
  )
}

// --- Tab 3: Inventory Turnover ---
const TurnoverView = ({ 
  transactions, 
  products,
  avgInventoryValue 
}: { 
  transactions: any[]
  products: any[]
  avgInventoryValue: number
}) => {
  const { fastMoving, deadStock, turnRate } = useMemo(() => {
    const movement: Record<string, number> = {}
    let totalCOGS = 0

    transactions.forEach(t => {
      const p = Array.isArray(t.products) ? t.products[0] : t.products
      if (t.transaction_type === 'sale' && p) {
         const qty = Math.abs(t.quantity_change)
         totalCOGS += qty * toNumber(p.cost_price)
      }
      
      if (p?.id) {
        movement[p.id] = (movement[p.id] || 0) + Math.abs(t.quantity_change)
      }
    })

    const sortedMovement = Object.entries(movement)
      .map(([id, moves]) => {
         const p = products.find(x => x.id === id)
         return { id, name: p?.name, sku: p?.sku, moves }
      })
      .sort((a, b) => b.moves - a.moves)

    const dead = products.filter(p => !movement[p.id])

    // Turn Rate = COGS / Avg Inventory
    const rate = avgInventoryValue > 0 ? (totalCOGS / avgInventoryValue) : 0

    return { fastMoving: sortedMovement, deadStock: dead, turnRate: rate }
  }, [transactions, products, avgInventoryValue])

  return (
    <div className="stack">
       <div className="grid grid-2">
          <div className="card stat">
             <h3>Inventory Turnover Rate</h3>
             <div className="value">{turnRate.toFixed(2)}x</div>
             <div className="small muted">COGS / Avg Inventory Value (30d)</div>
          </div>
          <div className="card stat">
             <h3>Dead Stock Count</h3>
             <div className="value">{deadStock.length}</div>
             <div className="small muted">Items with no movement in 30 days</div>
          </div>
       </div>

       <div className="grid grid-2">
         <div className="card stack">
            <h3 className="section-title">Fast Moving Items</h3>
            {fastMoving.length === 0 ? <EmptyState title="No Data" description="No movement recorded." /> : (
               <div className="list">
                  {fastMoving.slice(0, 8).map(i => (
                     <div key={i.id} className="flex-between">
                        <div>
                           <div style={{fontWeight: 600}}>{i.name}</div>
                           <div className="small muted">{i.sku}</div>
                        </div>
                        <span className="pill">{i.moves} moves</span>
                     </div>
                  ))}
               </div>
            )}
         </div>
         <div className="card stack">
            <h3 className="section-title">Potential Dead Stock</h3>
            {deadStock.length === 0 ? <EmptyState title="All clear" description="Everything is moving." /> : (
               <div className="list">
                  {deadStock.slice(0, 8).map(i => (
                     <div key={i.id} className="flex-between">
                        <div>
                           <div style={{fontWeight: 600}}>{i.name}</div>
                           <div className="small muted">{i.sku}</div>
                        </div>
                        <span className="badge warning">No Sales</span>
                     </div>
                  ))}
               </div>
            )}
         </div>
       </div>
    </div>
  )
}

// --- Tab 4: Audit Trail ---
const AuditTrailView = ({ transactions }: { transactions: any[] }) => {
  return (
    <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
       <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{margin: 0}}>Transaction Log</h3>
          <div className="small muted">Read-only audit log of all inventory changes.</div>
       </div>
       <table className="table">
          <thead>
             <tr>
                <th>Timestamp</th>
                <th>User</th>
                <th>Action</th>
                <th>Item</th>
                <th style={{textAlign: 'right'}}>Change</th>
                <th>IP Address</th>
                <th>User Agent</th>
             </tr>
          </thead>
          <tbody>
             {transactions.map(t => {
                const p = Array.isArray(t.products) ? t.products[0] : t.products
                const u = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
                return (
                  <tr key={t.id}>
                     <td className="small muted">{formatDateTime(t.created_at)}</td>
                     <td style={{fontWeight: 500}}>{u?.full_name || u?.username || 'System'}</td>
                     <td>
                        <span className="pill">{t.transaction_type}</span>
                     </td>
                     <td>
                        <div>{p?.name}</div>
                        <div className="small muted">{p?.sku}</div>
                     </td>
                     <td style={{textAlign: 'right', fontWeight: 600, color: t.quantity_change > 0 ? 'var(--success)' : 'var(--text)'}}>
                        {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                     </td>
                     <td className="small muted">192.168.x.x</td>
                     <td className="small muted" style={{maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap'}}>
                        Mozilla/5.0...
                     </td>
                  </tr>
                )
             })}
          </tbody>
       </table>
    </div>
  )
}

// --- Main Page ---

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
      supabase.from('products').select('id, name, sku, quantity_on_hand, cost_price, selling_price, category').eq('company_id', companyId),
      supabase.from('inventory_transactions').select(`
        id, transaction_type, quantity_change, created_at, notes,
        products (id, name, sku, cost_price, selling_price, category),
        profiles (full_name, username)
      `).eq('company_id', companyId).gte('created_at', new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()).order('created_at', { ascending: false }),
      supabase.from('report_schedules').select('*').eq('company_id', companyId),
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

  if (!companyId) return <EmptyState title="No company" description="Select a company." />
  if (isLoading) return <div className="empty-state">Loading reports...</div>

  return (
    <Tabs 
      tabs={[
        {
          id: 'valuation',
          label: 'Inventory Valuation',
          content: <ValuationView series={series} schedules={schedules} companyId={companyId} onScheduleChange={loadData} />
        },
        {
          id: 'profit',
          label: 'COGS & Profitability',
          content: <ProfitabilityView transactions={transactions} />
        },
        {
          id: 'turnover',
          label: 'Inventory Turnover',
          content: <TurnoverView transactions={transactions} products={products} avgInventoryValue={avgValue} />
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          content: <AuditTrailView transactions={transactions} />
        }
      ]}
    />
  )
}