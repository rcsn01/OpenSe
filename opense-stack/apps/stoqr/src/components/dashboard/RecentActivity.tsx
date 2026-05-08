import { Link } from 'react-router-dom'
import { Badge, Card, EmptyState } from '@repo/ui'
import { formatDateTime } from '../../utils'
import type { TransactionSummary } from './types'

export const RecentActivity = ({ transactions }: { transactions: TransactionSummary[] }) => {
  return (
    <Card className="flex flex-col gap-4">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Recent Activity</h3>
        <Link to="/inventory" className="text-sm text-[var(--color-muted-foreground)] transition-colors hover:text-[var(--color-foreground)]">
          View all
        </Link>
      </div>
      {transactions.length === 0 ? (
        <EmptyState title="No activity" description="Recent inventory movements will appear here." />
      ) : (
        <div className="flex flex-col gap-4">
          {transactions.map((t) => (
            <div
              key={t.id}
              className="flex flex-col gap-2 border-b border-[var(--color-border)] pb-4 last:border-b-0 last:pb-0"
            >
              <div className="flex items-center justify-between gap-3">
                <div>
                  <span className="font-medium text-[var(--color-foreground)]">
                    {t.products?.name ?? 'Unknown Product'}
                  </span>
                  <span className="text-[var(--color-muted-foreground)]"> &middot; {t.transaction_type}</span>
                </div>
                <Badge variant={t.quantity_change > 0 ? 'success' : 'neutral'}>
                  {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                </Badge>
              </div>
              <div className="text-sm text-[var(--color-muted-foreground)]">
                {formatDateTime(t.created_at)} by {t.profiles?.full_name ?? t.profiles?.username ?? 'System'}
              </div>
            </div>
          ))}
        </div>
      )}
    </Card>
  )
}
