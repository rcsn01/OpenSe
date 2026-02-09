import { useNavigate } from 'react-router-dom'
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
  const navigate = useNavigate()

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
          onClick={() => navigate('/inventory?stock=low')}
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
