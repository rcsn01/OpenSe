import { DollarSign, Package, AlertTriangle, XCircle } from 'lucide-react'
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
  const items = [
    {
      title: 'Revenue (30d)',
      value: formatCurrency(revenue30Days),
      subtext: 'Sales from tracked items',
      trend: '+5% from last month',
      icon: DollarSign,
      iconBg: 'rgba(34, 197, 94, 0.16)',
      iconColor: '#15803d',
    },
    {
      title: 'Inventory Value',
      value: formatCurrency(totalValue),
      subtext: `${totalProducts} total SKUs`,
      trend: '+2% from last month',
      icon: Package,
      iconBg: 'rgba(59, 130, 246, 0.16)',
      iconColor: '#1d4ed8',
    },
    {
      title: 'Low Stock',
      value: lowStockCount,
      subtext: 'Items below reorder point',
      trend: '+3% from last month',
      icon: AlertTriangle,
      iconBg: 'rgba(245, 158, 11, 0.18)',
      iconColor: '#b45309',
    },
    {
      title: 'Out of Stock',
      value: outOfStockCount,
      subtext: 'Items with 0 quantity',
      trend: '-1% from last month',
      icon: XCircle,
      iconBg: 'rgba(239, 68, 68, 0.18)',
      iconColor: '#b91c1c',
    },
  ]

  return (
    <div className="grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.title} className="card stat stat-card">
            <div className="flex-between">
              <div>
                <h3>{item.title}</h3>
                <div className="value" style={{ fontWeight: 700, fontSize: 28 }}>
                  {item.value}
                </div>
              </div>
              <div
                style={{
                  width: 44,
                  height: 44,
                  borderRadius: 14,
                  background: item.iconBg,
                  display: 'grid',
                  placeItems: 'center',
                }}
              >
                <Icon size={22} color={item.iconColor} />
              </div>
            </div>
            <div className="muted small" style={{ marginTop: 6 }}>{item.subtext}</div>
            <div className="small" style={{ marginTop: 8, color: '#16a34a', fontWeight: 600 }}>
              ↑ {item.trend}
            </div>
          </div>
        )
      })}
    </div>
  )
}
