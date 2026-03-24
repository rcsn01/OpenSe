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
        <div className="table-wrap">
          <table className="table">
            <thead>
              <tr>
                <th>Timestamp</th>
                <th>Type</th>
                <th>Product</th>
                <th>SKU</th>
                <th style={{ textAlign: 'right' }}>Qty</th>
                <th>Notes</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan={6} className="small muted" style={{ textAlign: 'center', padding: 24 }}>
                    No movement records in this range.
                  </td>
                </tr>
              ) : (
                transactions.map((row) => (
                  <tr key={row.id}>
                    <td className="small muted">{formatDateTime(row.created_at)}</td>
                    <td><span className="pill">{row.transaction_type}</span></td>
                    <td>{row.products?.name ?? 'Unknown'}</td>
                    <td className="small muted">{row.products?.sku ?? '—'}</td>
                    <td style={{ textAlign: 'right', fontWeight: 'var(--type-weight-semibold)' }}>
                      {row.quantity_change > 0 ? '+' : ''}{row.quantity_change}
                    </td>
                    <td className="small muted">{row.notes ?? '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
