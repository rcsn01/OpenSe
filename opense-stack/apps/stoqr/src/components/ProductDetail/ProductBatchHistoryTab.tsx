import { EmptyState } from '@repo/ui'
import { formatDateTime } from '../../utils'
import type { InventoryTransaction } from '../../types'

const humanizeToken = (value: string | null | undefined) => {
  if (!value) return '—'
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

const getTypeTone = (transactionType: string) => {
  if (transactionType === 'purchase' || transactionType === 'return' || transactionType === 'scan_in') return 'positive'
  if (transactionType === 'sale' || transactionType === 'loss' || transactionType === 'scan_out') return 'negative'
  return 'neutral'
}

const getSignedQuantity = (quantityChange: number) => (quantityChange > 0 ? `+${quantityChange}` : `${quantityChange}`)

export const ProductBatchHistoryTab = ({ transactions }: { transactions: InventoryTransaction[] }) => {
  const historyRows = transactions.slice(0, 12)

  return (
    <section className="product-tab-shell" aria-label="History">
      {historyRows.length === 0 ? (
        <EmptyState title="No history found" description="Product transactions will appear here as inventory changes are recorded." />
      ) : (
        <div className="product-detail-table-shell">
          <table className="product-detail-table product-detail-table--history">
            <thead>
              <tr>
                <th>Date &amp; Time</th>
                <th>User</th>
                <th>Type</th>
                <th>Source</th>
                <th>Qty Change</th>
                <th>Stock</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {historyRows.map((transaction) => (
                <tr key={transaction.id}>
                  <td>{formatDateTime(transaction.created_at)}</td>
                  <td>{transaction.profiles?.full_name ?? transaction.profiles?.username ?? 'System'}</td>
                  <td>
                    <span className={`product-history-pill product-history-pill--${getTypeTone(transaction.transaction_type)}`}>
                      {humanizeToken(transaction.transaction_type)}
                    </span>
                  </td>
                  <td>{humanizeToken(transaction.source)}</td>
                  <td className={`product-history-quantity product-history-quantity--${getTypeTone(transaction.transaction_type)}`}>
                    {getSignedQuantity(transaction.quantity_change)}
                  </td>
                  <td>{transaction.stock_after ?? '—'}</td>
                  <td className="product-detail-table-note">{transaction.notes?.trim() || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
