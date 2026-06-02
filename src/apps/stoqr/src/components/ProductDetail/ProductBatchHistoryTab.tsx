import { EmptyState } from '@repo/ui'
import { formatDateTime } from '../../utils'
import type { InventoryTransaction } from '../../types'
import { bindStyles } from '../../lib/bindStyles'
import styles from './ProductDetailSurface.module.css'

const sx = bindStyles(styles)

const humanizeToken = (value: string | null | undefined) => {
  if (!value) return '—'
  return value
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (character) => character.toUpperCase())
}

const getTypeTone = (transactionType: string) => {
  if (['purchase', 'return', 'scan_in', 'transfer_in'].includes(transactionType)) return 'positive'
  if (['sale', 'loss', 'scan_out', 'transfer_out'].includes(transactionType)) return 'negative'
  return 'neutral'
}

const getSignedQuantity = (transaction: InventoryTransaction) => {
  if (transaction.transaction_type === 'transfer_in') return `+${Math.abs(transaction.quantity_change)}`
  if (transaction.transaction_type === 'transfer_out') return `-${Math.abs(transaction.quantity_change)}`
  return transaction.quantity_change > 0 ? `+${transaction.quantity_change}` : `${transaction.quantity_change}`
}

export const ProductBatchHistoryTab = ({ transactions }: { transactions: InventoryTransaction[] }) => {
  const historyRows = transactions.slice(0, 12)

  return (
    <section className={sx('product-tab-shell')} aria-label="History">
      {historyRows.length === 0 ? (
        <EmptyState title="No history found" description="Product transactions will appear here as inventory changes are recorded." />
      ) : (
        <div className={sx('product-detail-table-shell')}>
          <table className={sx('product-detail-table', 'product-detail-table--history')}>
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
                    <span className={sx('product-history-pill', `product-history-pill--${getTypeTone(transaction.transaction_type)}`)}>
                      {humanizeToken(transaction.transaction_type)}
                    </span>
                  </td>
                  <td>{humanizeToken(transaction.source)}</td>
                  <td className={sx('product-history-quantity', `product-history-quantity--${getTypeTone(transaction.transaction_type)}`)}>
                    {getSignedQuantity(transaction)}
                  </td>
                  <td>{transaction.stock_after ?? '—'}</td>
                  <td className={sx('product-detail-table-note')}>{transaction.notes?.trim() || '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}
