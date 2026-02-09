import { useMemo } from 'react'
import { formatCurrency, toNumber } from '../../utils'

export const ProfitabilityTab = ({ transactions }: { transactions: any[] }) => {
  const stats = useMemo(() => {
    const byProduct: Record<string, { name: string; sku: string; revenue: number; cogs: number; profit: number }> = {}
    const byCategory: Record<string, { revenue: number; cogs: number; profit: number }> = {}

    transactions.forEach((t) => {
      if (t.transaction_type !== 'sale') return

      const p = Array.isArray(t.products) ? t.products[0] : t.products
      if (!p) return

      const qty = Math.abs(t.quantity_change)
      const revenue = qty * toNumber(p.selling_price)
      const cogs = qty * toNumber(p.cost_price)
      const profit = revenue - cogs
      const category = p.category || 'Uncategorized'

      if (!byProduct[p.id]) {
        byProduct[p.id] = { name: p.name, sku: p.sku, revenue: 0, cogs: 0, profit: 0 }
      }
      byProduct[p.id].revenue += revenue
      byProduct[p.id].cogs += cogs
      byProduct[p.id].profit += profit

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
        .sort((a, b) => b.profit - a.profit),
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
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Category</th>
                  <th style={{ textAlign: 'right' }}>Revenue</th>
                  <th style={{ textAlign: 'right' }}>Margin</th>
                </tr>
              </thead>
              <tbody>
                {stats.categories.map((c) => (
                  <tr key={c.name}>
                    <td>{c.name}</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(c.revenue)}</td>
                    <td style={{ textAlign: 'right' }}>{((c.profit / c.revenue) * 100).toFixed(1)}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        <div className="card stack">
          <h3 className="section-title">Top Products by Profit</h3>
          <div className="list">
            {stats.products.slice(0, 5).map((p) => (
              <div key={p.sku} className="flex-between">
                <div>
                  <div style={{ fontWeight: 600 }}>{p.name}</div>
                  <div className="small muted">{p.sku}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontWeight: 600 }}>{formatCurrency(p.profit)}</div>
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
