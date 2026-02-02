import { MetricCard } from '../MetricCard'
import { formatCurrency } from '../../utils'

export const StatsCards = ({
  revenue30Days,
  totalValue,
  totalProducts,
  lowStockCount,
  outOfStockCount,
}: {
  revenue30Days: number
  totalValue: number
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
}) => {
  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      <MetricCard
        title="Revenue (30d)"
        value={formatCurrency(revenue30Days)}
        subtext="Sales from tracked items"
      />
      <MetricCard
        title="Inventory Value"
        value={formatCurrency(totalValue)}
        subtext={`${totalProducts} total SKUs`}
      />
      <div className="card stat" style={{ borderLeft: '4px solid var(--warning)' }}>
        <h3>Low Stock</h3>
        <div className="value">{lowStockCount}</div>
        <div className="muted small">Items below reorder point</div>
      </div>
      <div className="card stat" style={{ borderLeft: '4px solid var(--danger)' }}>
        <h3>Out of Stock</h3>
        <div className="value">{outOfStockCount}</div>
        <div className="muted small">Items with 0 quantity</div>
      </div>
    </div>
  )
}
