import { useMemo } from 'react'
import type { InventoryProduct } from './types'

export const VariantsTab = ({ products }: { products: InventoryProduct[] }) => {
  const matrices = useMemo(() => {
    const groups: Record<string, InventoryProduct[]> = {}
    products.forEach((p) => {
      const key = p.name.split(' ')[0]
      if (!groups[key]) groups[key] = []
      groups[key].push(p)
    })
    return groups
  }, [products])

  return (
    <div className="stack">
      <div className="card">
        <div className="flex-between">
          <div>
            <h3 className="section-title">Product Matrices</h3>
            <p className="muted small">Manage variants like Size and Color (Simulated View)</p>
          </div>
          <button className="button secondary">Create Matrix</button>
        </div>
      </div>

      <div className="grid grid-2">
        {Object.entries(matrices).slice(0, 6).map(([key, items]) => (
          <div key={key} className="card stack">
            <div className="flex-between">
              <h4 style={{ margin: 0 }}>{key} Family</h4>
              <span className="pill">{items.length} variants</span>
            </div>
            <div className="list">
              {items.map((p) => (
                <div key={p.id} className="flex-between small">
                  <span>{p.name}</span>
                  <span className="muted">{p.quantity_on_hand} units</span>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
