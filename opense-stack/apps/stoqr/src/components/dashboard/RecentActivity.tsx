import { Link } from 'react-router-dom'
import { EmptyState } from '../EmptyState'
import { formatDateTime } from '../../utils'
import type { TransactionSummary } from './types'

export const RecentActivity = ({ transactions }: { transactions: TransactionSummary[] }) => {
  return (
    <div className="card stack">
      <div className="flex-between">
        <h3 className="section-title">Recent Activity</h3>
        <Link to="/inventory" className="small muted">View all</Link>
      </div>
      {transactions.length === 0 ? (
        <EmptyState title="No activity" description="Recent inventory movements will appear here." />
      ) : (
        <div className="timeline">
          {transactions.map((t) => (
            <div key={t.id} className="timeline-item">
              <div className="flex-between">
                <div>
                  <span style={{ fontWeight: 500 }}>
                    {t.products?.name ?? 'Unknown Product'}
                  </span>
                  <span className="muted"> &middot; {t.transaction_type}</span>
                </div>
                <span className={`badge ${t.quantity_change > 0 ? 'success' : 'neutral'}`}>
                  {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                </span>
              </div>
              <div className="small muted" style={{ marginTop: 4 }}>
                {formatDateTime(t.created_at)} by {t.profiles?.full_name ?? t.profiles?.username ?? 'System'}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
