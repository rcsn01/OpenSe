import { EmptyState } from '../EmptyState'
import { formatCurrency } from '../../utils'
import type { TopMover } from './types'

export const TopMovers = ({ topMovers }: { topMovers: TopMover[] }) => {
  return (
    <div className="card stack">
      <h3 className="section-title">Top Movers (30d)</h3>
      {topMovers.length === 0 ? (
        <EmptyState title="No sales data" description="Record sales to see top performers." />
      ) : (
        <div className="list">
          {topMovers.map((item) => (
            <div key={item.id} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
              <div>
                <div style={{ fontWeight: 'var(--type-weight-semibold)' }}>{item.name}</div>
                <div className="small muted">SKU: {item.sku}</div>
              </div>
              <div style={{ textAlign: 'right' }}>
                <div style={{ fontWeight: 'var(--type-weight-semibold)' }}>{formatCurrency(item.revenue)}</div>
                <div className="small muted">{item.totalSold} sold</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
