import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import { formatCurrency } from '../utils'

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
  const [series, setSeries] = useState<{ date: string; value: number }[]>([])
  const [fastMoving, setFastMoving] = useState<{ id: string; name: string; sku: string; change: number }[]>([])
  const [deadStock, setDeadStock] = useState<{ id: string; name: string; sku: string }[]>([])
  const [schedules, setSchedules] = useState<any[]>([])
  const [newSchedule, setNewSchedule] = useState({
    report_type: 'low_stock',
    cadence: 'weekly',
    day_of_week: 1,
    day_of_month: 1,
    time_of_day: '09:00',
    recipients: '',
  })
  const [isLoading, setIsLoading] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const loadData = async () => {
    if (!companyId) return
    setIsLoading(true)

    const [{ data: productData }, { data: transactionData }, { data: scheduleData }] = await Promise.all([
      supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, cost_price')
        .eq('company_id', companyId),
      supabase
        .from('inventory_transactions')
        .select('product_id, quantity_change, created_at, products (id, cost_price, name, sku)')
        .eq('company_id', companyId)
        .gte('created_at', new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString()),
      supabase.from('report_schedules').select('*').eq('company_id', companyId),
    ])

    const products = (productData ?? []) as any[]
    const transactions = (transactionData ?? []) as any[]

    const currentValue = products.reduce((sum, product) => {
      return sum + (product.quantity_on_hand ?? 0) * (product.cost_price ?? 0)
    }, 0)

    const deltasByDay: Record<string, number> = {}
    const movementByProduct: Record<string, { id: string; name: string; sku: string; change: number }> = {}

    transactions.forEach((transaction) => {
      const day = formatDay(new Date(transaction.created_at))
      const productRef = Array.isArray(transaction.products) ? transaction.products[0] : transaction.products
      const costPrice = productRef?.cost_price ?? 0
      const valueDelta = (transaction.quantity_change ?? 0) * costPrice
      deltasByDay[day] = (deltasByDay[day] ?? 0) + valueDelta

      if (productRef?.id) {
        if (!movementByProduct[productRef.id]) {
          movementByProduct[productRef.id] = {
            id: productRef.id,
            name: productRef.name,
            sku: productRef.sku,
            change: 0,
          }
        }
        movementByProduct[productRef.id].change += Math.abs(transaction.quantity_change ?? 0)
      }
    })

    const movementList = Object.values(movementByProduct).sort((a, b) => b.change - a.change)
    const deadStockList = products
      .filter((product) => !movementByProduct[product.id])
      .slice(0, 6)
      .map((product) => ({ id: product.id, name: product.name, sku: product.sku }))

    setSeries(buildSeries(currentValue, deltasByDay))
    setFastMoving(movementList.slice(0, 6))
    setDeadStock(deadStockList)
    setSchedules((scheduleData ?? []) as any[])
    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [companyId])

  const handleCreateSchedule = async () => {
    if (!companyId) return
    setMessage(null)
    const { error } = await supabase.from('report_schedules').insert({
      company_id: companyId,
      report_type: newSchedule.report_type,
      cadence: newSchedule.cadence,
      day_of_week: newSchedule.cadence === 'weekly' ? newSchedule.day_of_week : null,
      day_of_month: newSchedule.cadence === 'monthly' ? newSchedule.day_of_month : null,
      time_of_day: newSchedule.time_of_day,
      recipients: newSchedule.recipients
        .split(',')
        .map((email) => email.trim())
        .filter(Boolean),
    })

    setMessage(error ? error.message : 'Schedule saved.')
    if (!error) {
      setNewSchedule((prev) => ({ ...prev, recipients: '' }))
      loadData()
    }
  }

  const handleDeleteSchedule = async (id: string) => {
    await supabase.from('report_schedules').delete().eq('id', id)
    loadData()
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

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to view reports." />
  }

  if (isLoading) {
    return <div className="empty-state">Loading reports...</div>
  }

  return (
    <div className="stack">
      <div className="card stack">
        <div className="flex-between">
          <div>
            <h3 className="section-title">Stock valuation</h3>
            <div className="muted small">Rolling {DAYS}-day inventory value based on cost price.</div>
          </div>
          <div className="pill">Latest: {formatCurrency(series.at(-1)?.value ?? 0)}</div>
        </div>
        {series.length === 0 ? (
          <EmptyState title="No data" description="Create transactions to generate valuation history." />
        ) : (
          <div style={{ width: '100%', height: 240 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <path d={chartPath} fill="none" stroke="#2563eb" strokeWidth="2" />
            </svg>
          </div>
        )}
      </div>

      <div className="grid grid-2">
        <div className="card">
          <h3 className="section-title">Fast-moving items</h3>
          {fastMoving.length === 0 ? (
            <EmptyState title="No movement" description="Track transactions to see movement trends." />
          ) : (
            <div className="list">
              {fastMoving.map((item) => (
                <div key={item.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div className="small muted">SKU {item.sku}</div>
                  </div>
                  <span className="pill">{item.change} moves</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card">
          <h3 className="section-title">Dead stock</h3>
          {deadStock.length === 0 ? (
            <EmptyState title="No dead stock" description="All items have recent movement." />
          ) : (
            <div className="list">
              {deadStock.map((item) => (
                <div key={item.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{item.name}</div>
                    <div className="small muted">SKU {item.sku}</div>
                  </div>
                  <span className="badge warning">No movement</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Report subscriptions</h3>
          <span className="pill">{schedules.length} schedules</span>
        </div>
        <div className="grid grid-2">
          <div className="stack">
            <label className="stack">
              Report type
              <select
                className="select"
                value={newSchedule.report_type}
                onChange={(event) => setNewSchedule((prev) => ({ ...prev, report_type: event.target.value }))}
              >
                <option value="low_stock">Low stock</option>
                <option value="stock_valuation">Stock valuation</option>
                <option value="item_flow">Item flow</option>
              </select>
            </label>
            <label className="stack">
              Cadence
              <select
                className="select"
                value={newSchedule.cadence}
                onChange={(event) => setNewSchedule((prev) => ({ ...prev, cadence: event.target.value }))}
              >
                <option value="daily">Daily</option>
                <option value="weekly">Weekly</option>
                <option value="monthly">Monthly</option>
              </select>
            </label>
            {newSchedule.cadence === 'weekly' && (
              <label className="stack">
                Day of week
                <select
                  className="select"
                  value={newSchedule.day_of_week}
                  onChange={(event) => setNewSchedule((prev) => ({ ...prev, day_of_week: Number(event.target.value) }))}
                >
                  <option value={1}>Monday</option>
                  <option value={2}>Tuesday</option>
                  <option value={3}>Wednesday</option>
                  <option value={4}>Thursday</option>
                  <option value={5}>Friday</option>
                  <option value={6}>Saturday</option>
                  <option value={0}>Sunday</option>
                </select>
              </label>
            )}
            {newSchedule.cadence === 'monthly' && (
              <label className="stack">
                Day of month
                <input
                  className="input"
                  type="number"
                  min={1}
                  max={28}
                  value={newSchedule.day_of_month}
                  onChange={(event) => setNewSchedule((prev) => ({ ...prev, day_of_month: Number(event.target.value) }))}
                />
              </label>
            )}
            <label className="stack">
              Time of day
              <input
                className="input"
                type="time"
                value={newSchedule.time_of_day}
                onChange={(event) => setNewSchedule((prev) => ({ ...prev, time_of_day: event.target.value }))}
              />
            </label>
            <label className="stack">
              Recipients
              <input
                className="input"
                placeholder="emails, separated by commas"
                value={newSchedule.recipients}
                onChange={(event) => setNewSchedule((prev) => ({ ...prev, recipients: event.target.value }))}
              />
            </label>
            <button className="button" type="button" onClick={handleCreateSchedule}>
              Save schedule
            </button>
            {message && <div className="muted small">{message}</div>}
          </div>
          <div className="stack">
            {schedules.length === 0 ? (
              <EmptyState title="No schedules" description="Create a report schedule to email your team." />
            ) : (
              <div className="list">
                {schedules.map((schedule) => (
                  <div key={schedule.id} className="card" style={{ boxShadow: 'none' }}>
                    <div className="flex-between">
                      <div>
                        <div style={{ fontWeight: 600 }}>{schedule.report_type.replace('_', ' ')}</div>
                        <div className="small muted">
                          {schedule.cadence} · {schedule.time_of_day ?? '09:00'}
                        </div>
                      </div>
                      <button className="button ghost" onClick={() => handleDeleteSchedule(schedule.id)}>
                        Delete
                      </button>
                    </div>
                    <div className="small muted">Recipients: {(schedule.recipients ?? []).join(', ')}</div>
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
