type ReportProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  cost_price: number | null
}

type ReportTransaction = {
  created_at: string
  products: { id: string } | null
}

export const ReorderDeadStockTab = ({
  products,
  transactions,
  startDate,
  endDate,
}: {
  products: ReportProduct[]
  transactions: ReportTransaction[]
  startDate: string
  endDate: string
}) => {
  const nowStart = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY
  const nowEnd = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY

  const movementSet = new Set(
    transactions
      .filter((row) => {
        const t = new Date(row.created_at).getTime()
        return t >= nowStart && t <= nowEnd && !!row.products?.id
      })
      .map((row) => row.products?.id as string),
  )

  const reorderCandidates = products.filter((product) => product.quantity_on_hand <= 0)
  const deadStock = products.filter((product) => !movementSet.has(product.id))

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card stat">
          <h3>Reorder Candidates</h3>
          <div className="value">{reorderCandidates.length}</div>
          <div className="small muted">Items currently at or below zero stock.</div>
        </div>
        <div className="card stat">
          <h3>Dead Stock</h3>
          <div className="value">{deadStock.length}</div>
          <div className="small muted">No movement in selected date range.</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <h3 className="section-title">Reorder Point Analysis</h3>
          {reorderCandidates.length === 0 ? (
            <div className="empty-state">No reorder candidates right now.</div>
          ) : (
            <div className="list">
              {reorderCandidates.slice(0, 15).map((product) => (
                <div key={product.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="small muted">{product.sku}</div>
                  </div>
                  <span className="badge warning">Qty {product.quantity_on_hand}</span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="card stack">
          <h3 className="section-title">Dead Stock Identification</h3>
          {deadStock.length === 0 ? (
            <div className="empty-state">No dead stock in this range.</div>
          ) : (
            <div className="list">
              {deadStock.slice(0, 15).map((product) => (
                <div key={product.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{product.name}</div>
                    <div className="small muted">{product.sku}</div>
                  </div>
                  <span className="pill">No movement</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
