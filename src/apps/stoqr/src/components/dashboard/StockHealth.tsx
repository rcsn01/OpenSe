import { Card, Progress, cn } from '@repo/ui'
import { useNavigate } from 'react-router-dom'

const resolveVariant = (color: string) => {
  if (color === 'var(--success)' || color === 'var(--color-success)') return 'success' as const
  if (color === 'var(--warning)' || color === 'var(--color-warning)') return 'warning' as const
  if (color === 'var(--danger)' || color === 'var(--color-destructive)' || color === 'var(--color-destructive-hover)') {
    return 'destructive' as const
  }

  return 'default' as const
}

const StockHealthProgressRow = ({
  label,
  value,
  max,
  color,
  onClick,
}: {
  label: string
  value: number
  max: number
  color: string
  onClick?: () => void
}) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0

  return (
    <button
      type={onClick ? 'button' : undefined}
      className={cn('mb-2 block w-full text-left', onClick && 'cursor-pointer')}
      onClick={onClick}
    >
      <div className="mb-1 flex items-center justify-between gap-3 text-xs">
        <span className="font-medium text-[var(--color-foreground)]">{label}</span>
        <span className="text-[var(--color-muted-foreground)]">
          {value} / {max}
        </span>
      </div>
      <Progress value={percent} variant={resolveVariant(color)} size="sm" />
    </button>
  )
}

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
    <Card className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Stock Health</h3>
      <div className="mt-2">
        <StockHealthProgressRow
          label="Healthy Stock"
          value={totalProducts - lowStockCount - outOfStockCount}
          max={totalProducts}
          color="var(--success)"
        />
        <StockHealthProgressRow
          label="Low Stock"
          value={lowStockCount}
          max={totalProducts}
          color="var(--warning)"
          onClick={() => navigate('/inventory?stock=low')}
        />
        <StockHealthProgressRow
          label="Out of Stock"
          value={outOfStockCount}
          max={totalProducts}
          color="var(--danger)"
        />
      </div>
    </Card>
  )
}
