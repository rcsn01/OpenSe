import { Card, EmptyState } from '@repo/ui'
import { formatCurrency } from '../../utils'
import type { TopMover } from './types'

export const TopMovers = ({ topMovers }: { topMovers: TopMover[] }) => {
  return (
    <Card className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Top Movers (30d)</h3>
      {topMovers.length === 0 ? (
        <EmptyState title="No sales data" description="Record sales to see top performers." />
      ) : (
        <div className="flex flex-col">
          {topMovers.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] py-2 last:border-b-0"
            >
              <div>
                <div className="font-semibold text-[var(--color-foreground)]">{item.name}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">SKU: {item.sku}</div>
              </div>
              <div className="text-right">
                <div className="font-semibold text-[var(--color-foreground)]">{formatCurrency(item.revenue)}</div>
                <div className="text-sm text-[var(--color-muted-foreground)]">{item.totalSold} sold</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
