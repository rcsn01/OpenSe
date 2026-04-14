import { DataTable } from '@repo/ui'
import { formatDateTime } from '../../utils'

type MovementRow = {
  id: string
  created_at: string
  transaction_type: string
  quantity_change: number
  notes: string | null
  products: { name: string; sku: string } | null
}

export const StockMovementUsageTab = ({ transactions }: { transactions: MovementRow[] }) => {
  const movementIn = transactions
    .filter((row) => row.quantity_change > 0)
    .reduce((sum, row) => sum + row.quantity_change, 0)

  const movementOut = transactions
    .filter((row) => row.quantity_change < 0)
    .reduce((sum, row) => sum + Math.abs(row.quantity_change), 0)

  const usageTransactions = transactions.filter((row) =>
    ['sale', 'usage', 'consume', 'scan_out', 'adjustment'].includes(row.transaction_type.toLowerCase()),
  )

  const usageQty = usageTransactions
    .filter((row) => row.quantity_change < 0)
    .reduce((sum, row) => sum + Math.abs(row.quantity_change), 0)

  return (
    <div className="stack">
      <div className="grid grid-3">
        <div className="card stat">
          <h3>Stock In</h3>
          <div className="value">{movementIn}</div>
        </div>
        <div className="card stat">
          <h3>Stock Out</h3>
          <div className="value">{movementOut}</div>
        </div>
        <div className="card stat">
          <h3>Usage / Depletion</h3>
          <div className="value">{usageQty}</div>
        </div>
      </div>

      <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
        <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
          <h3 className="section-title" style={{ margin: 0 }}>Stock Movement History</h3>
          <div className="small muted">Filtered by selected date range.</div>
        </div>
        <DataTable
          columns={[
            {
              id: 'timestamp',
              header: 'Timestamp',
              renderCell: (row: MovementRow) => <span className="small muted">{formatDateTime(row.created_at)}</span>,
            },
            {
              id: 'type',
              header: 'Type',
              renderCell: (row: MovementRow) => <span className="pill">{row.transaction_type}</span>,
            },
            {
              id: 'product',
              header: 'Product',
              renderCell: (row: MovementRow) => row.products?.name ?? 'Unknown',
            },
            {
              id: 'sku',
              header: 'SKU',
              renderCell: (row: MovementRow) => <span className="small muted">{row.products?.sku ?? '—'}</span>,
            },
            {
              id: 'qty',
              header: 'Qty',
              align: 'right',
              renderCell: (row: MovementRow) => (
                <span style={{ fontWeight: 'var(--type-weight-semibold)' }}>
                  {row.quantity_change > 0 ? '+' : ''}{row.quantity_change}
                </span>
              ),
            },
            {
              id: 'notes',
              header: 'Notes',
              renderCell: (row: MovementRow) => <span className="small muted">{row.notes ?? '—'}</span>,
            },
          ]}
          rows={transactions}
          getRowId={(row) => row.id}
          emptyState="No movement records in this range."
          tableWrapClassName="border-0 rounded-none"
        />
      </div>
    </div>
  )
}
