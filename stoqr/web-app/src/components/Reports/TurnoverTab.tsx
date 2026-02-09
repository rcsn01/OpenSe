import { useMemo } from 'react'
import { EmptyState } from '../EmptyState'
import { toNumber } from '../../utils'

export const TurnoverTab = ({
  transactions,
  products,
  avgInventoryValue,
}: {
  transactions: any[]
  products: any[]
  avgInventoryValue: number
}) => {
  const { fastMoving, deadStock, turnRate } = useMemo(() => {
    const movement: Record<string, number> = {}
    let totalCOGS = 0

    transactions.forEach((t) => {
      const p = Array.isArray(t.products) ? t.products[0] : t.products
      if (t.transaction_type === 'sale' && p) {
        const qty = Math.abs(t.quantity_change)
        totalCOGS += qty * toNumber(p.cost_price)
      }

      if (p?.id) {
        movement[p.id] = (movement[p.id] || 0) + Math.abs(t.quantity_change)
      }
    })

    const sortedMovement = Object.entries(movement)
      .map(([id, moves]) => {
        const p = products.find((x) => x.id === id)
        return { id, name: p?.name, sku: p?.sku, moves }
      })
      .sort((a, b) => b.moves - a.moves)

    const dead = products.filter((p) => !movement[p.id])

    const rate = avgInventoryValue > 0 ? totalCOGS / avgInventoryValue : 0

    return { fastMoving: sortedMovement, deadStock: dead, turnRate: rate }
  }, [transactions, products, avgInventoryValue])

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card stat">
          <h3>Inventory Turnover Rate</h3>
          <div className="value">{turnRate.toFixed(2)}x</div>
          <div className="small muted">COGS / Avg Inventory Value (30d)</div>
        </div>
        <div className="card stat">
          <h3>Dead Stock Count</h3>
          <div className="value">{deadStock.length}</div>
          <div className="small muted">Items with no movement in 30 days</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <h3 className="section-title">Fast Moving Items</h3>
          {fastMoving.length === 0 ? (
            <EmptyState title="No Data" description="No movement recorded." />
          ) : (
            <div className="list">
              {fastMoving.slice(0, 8).map((i) => (
                <div key={i.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{i.name}</div>
                    <div className="small muted">{i.sku}</div>
                  </div>
                  <span className="pill">{i.moves} moves</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="card stack">
          <h3 className="section-title">Potential Dead Stock</h3>
          {deadStock.length === 0 ? (
            <EmptyState title="All clear" description="Everything is moving." />
          ) : (
            <div className="list">
              {deadStock.slice(0, 8).map((i) => (
                <div key={i.id} className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{i.name}</div>
                    <div className="small muted">{i.sku}</div>
                  </div>
                  <span className="badge warning">No Sales</span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
