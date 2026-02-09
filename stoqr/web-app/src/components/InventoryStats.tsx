import { formatCurrency } from '../utils'

type InventoryStatsProps = {
  totalItems: number
  lowStockItems: number
  totalValue: number
  isLoading?: boolean
}

export const InventoryStats = ({ totalItems, lowStockItems, totalValue, isLoading }: InventoryStatsProps) => {
  if (isLoading) {
    return (
      <div className="grid grid-3" style={{ marginBottom: 24 }}>
        {[1, 2, 3].map((i) => (
          <div key={i} className="card" style={{ height: 88, background: '#f8fafc' }} />
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-3" style={{ marginBottom: 24 }}>
      <div className="card stat">
        <div className="flex-between">
          <h3 style={{margin:0}}>Total SKU Count</h3>
          <span className="pill">Active</span>
        </div>
        <div className="value">{totalItems}</div>
      </div>
      
      <div className="card stat" style={{ borderLeft: lowStockItems > 0 ? '4px solid var(--warning)' : undefined }}>
        <div className="flex-between">
          <h3 style={{margin:0}}>Low Stock Alerts</h3>
          {lowStockItems > 0 && <span className="badge warning">Action needed</span>}
        </div>
        <div className="value">{lowStockItems}</div>
      </div>

      <div className="card stat">
        <div className="flex-between">
          <h3 style={{margin:0}}>Total Asset Value</h3>
          <span className="pill">Cost Basis</span>
        </div>
        <div className="value">{formatCurrency(totalValue)}</div>
      </div>
    </div>
  )
}