import { ProgressBar } from '../ProgressBar'

export const StockHealth = ({
  totalProducts,
  lowStockCount,
  outOfStockCount,
}: {
  totalProducts: number
  lowStockCount: number
  outOfStockCount: number
}) => {
  return (
    <div className="card stack">
      <h3 className="section-title">Stock Health</h3>
      <div style={{ marginTop: 8 }}>
        <ProgressBar
          label="Healthy Stock"
          value={totalProducts - lowStockCount - outOfStockCount}
          max={totalProducts}
          color="var(--success)"
        />
        <ProgressBar
          label="Low Stock"
          value={lowStockCount}
          max={totalProducts}
          color="var(--warning)"
        />
        <ProgressBar
          label="Out of Stock"
          value={outOfStockCount}
          max={totalProducts}
          color="var(--danger)"
        />
      </div>
    </div>
  )
}
