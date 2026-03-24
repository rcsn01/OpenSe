import { Package, Layers3, AlertTriangle, ClipboardList } from 'lucide-react'
import { StackLayout } from '@repo/ui'
import { formatCurrency } from '../../utils'

export const StatsCards = ({
  totalValue,
  totalStockUnits,
  lowStockCount,
  pendingOrders,
}: {
  totalValue: number
  totalStockUnits: number
  lowStockCount: number
  pendingOrders: number
}) => {
  const items = [
    {
      title: 'Total Inventory Value',
      value: formatCurrency(totalValue),
      subtext: 'Based on current cost price',
      trend: 'KPI',
      icon: Package,
      iconBg: 'rgba(59, 130, 246, 0.16)',
      iconColor: '#1d4ed8',
    },
    {
      title: 'Stock Levels',
      value: totalStockUnits,
      subtext: 'Total units currently on hand',
      trend: 'KPI',
      icon: Layers3,
      iconBg: 'rgba(99, 102, 241, 0.16)',
      iconColor: '#4338ca',
    },
    {
      title: 'Low Stock Alerts',
      value: lowStockCount,
      subtext: 'Items below reorder point',
      trend: 'KPI',
      icon: AlertTriangle,
      iconBg: 'rgba(245, 158, 11, 0.18)',
      iconColor: '#b45309',
    },
    {
      title: 'Pending Orders',
      value: pendingOrders,
      subtext: 'Draft, sent, or partially received',
      trend: 'KPI',
      icon: ClipboardList,
      iconBg: 'rgba(16, 185, 129, 0.16)',
      iconColor: '#047857',
    },
  ]

  return (
    <StackLayout variant="stats">
      {items.map((item) => {
        const Icon = item.icon
        return (
          <div key={item.title} className="card stat stat-card">
            <div className="flex-between">
              <div>
                <h3>{item.title}</h3>
                <div className="value" style={{ fontWeight: 'var(--type-weight-bold)', fontSize: 'var(--type-size-4xl)' }}>
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
            <div className="small" style={{ marginTop: 8, color: 'var(--muted)', fontWeight: 'var(--type-weight-semibold)' }}>
              {item.trend}
            </div>
          </div>
        )
      })}
    </StackLayout>
  )
}
