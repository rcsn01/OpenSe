import type { InventoryProduct } from './types'
import { EmptyState } from '../EmptyState'

export const TransferTab = ({ products }: { products: InventoryProduct[] }) => {
  return (
    <div className="grid grid-2">
      <div className="card stack">
        <h3 className="section-title">New Transfer</h3>
        <div className="grid grid-2">
          <label className="stack">
            Source Location
            <select className="select">
              <option>Main Warehouse</option>
              <option>Retail Store A</option>
              <option>Returns Bin</option>
            </select>
          </label>
          <label className="stack">
            Destination
            <select className="select">
              <option>Retail Store A</option>
              <option>Main Warehouse</option>
            </select>
          </label>
        </div>
        <label className="stack">
          Product
          <select className="select">
            <option value="">Select product...</option>
            {products.map((p) => (
              <option key={p.id} value={p.id}>{p.name} ({p.quantity_on_hand})</option>
            ))}
          </select>
        </label>
        <label className="stack">
          Quantity
          <input type="number" className="input" defaultValue={1} />
        </label>
        <button className="button" disabled>Initiate Transfer (Coming Soon)</button>
        <p className="small muted">
          Note: Multi-location support is currently in development. This action will log a movement transaction.
        </p>
      </div>
      <div className="card">
        <h3 className="section-title">Recent Transfers</h3>
        <EmptyState title="No recent transfers" description="Internal stock movements will appear here." />
      </div>
    </div>
  )
}
