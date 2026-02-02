import type { InventoryProduct } from './types'
import { EmptyState } from '../EmptyState'

export const BundlesTab = ({ products }: { products: InventoryProduct[] }) => {
  return (
    <div className="grid grid-2">
      <div className="card stack">
        <h3 className="section-title">Create Bundle</h3>
        <label className="stack">
          Bundle Name
          <input className="input" placeholder="e.g. Summer Gift Pack" />
        </label>
        <label className="stack">
          Bundle SKU
          <input className="input" placeholder="e.g. BDL-SUMMER-01" />
        </label>

        <div className="stack" style={{ borderTop: '1px solid var(--border)', paddingTop: 16 }}>
          <h4 className="section-title">Components</h4>
          <div className="row">
            <select className="select">
              <option>Add component...</option>
              {products.map((p) => <option key={p.id}>{p.name}</option>)}
            </select>
            <input type="number" className="input" placeholder="Qty" style={{ width: 80 }} />
            <button className="button secondary">Add</button>
          </div>
        </div>

        <button className="button" style={{ marginTop: 16 }} disabled>Save Bundle (Coming Soon)</button>
      </div>
      <div className="card">
        <h3 className="section-title">Active Bundles</h3>
        <EmptyState title="No active bundles" description="Define virtual SKUs composed of other products." />
      </div>
    </div>
  )
}
