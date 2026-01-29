import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { Product } from '../types'
import { EmptyState } from '../components/EmptyState'

export const Procurement = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)

  const loadProducts = async () => {
    if (!companyId) return
    setIsLoading(true)

    let query = supabase
      .from('products')
      .select('id, name, sku, quantity_on_hand, reorder_point')
      .eq('company_id', companyId)
      .order('name')

    if (search.trim()) {
      query = query.or(`name.ilike.%${search}%,sku.ilike.%${search}%`)
    }

    const { data, error } = await query
    if (error) {
      console.error(error)
      setProducts([])
    } else {
      setProducts((data as Product[]) ?? [])
    }
    setIsLoading(false)
  }

  useEffect(() => {
    loadProducts()
  }, [companyId, search])

  const selectedProducts = useMemo(() => {
    return products.filter((product) => selectedIds.includes(product.id))
  }, [products, selectedIds])

  const lowStock = products.filter((product) => product.quantity_on_hand <= product.reorder_point)

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to build pick lists." />
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '320px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Select items</h3>
        <input
          className="input"
          placeholder="Search products"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
        />
        {isLoading ? (
          <div className="empty-state">Loading products...</div>
        ) : (
          <div className="list" style={{ maxHeight: 420, overflowY: 'auto' }}>
            {products.map((product) => (
              <label key={product.id} className="row" style={{ alignItems: 'center' }}>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(product.id)}
                  onChange={(event) => {
                    setSelectedIds((prev) =>
                      event.target.checked
                        ? [...prev, product.id]
                        : prev.filter((id) => id !== product.id),
                    )
                  }}
                />
                <div>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div className="small muted">SKU {product.sku}</div>
                </div>
              </label>
            ))}
          </div>
        )}
        <button className="button" type="button" onClick={() => window.print()} disabled={selectedIds.length === 0}>
          Print pick list
        </button>
        <button
          className="button secondary"
          type="button"
          onClick={() => setSelectedIds(lowStock.map((item) => item.id))}
          disabled={lowStock.length === 0}
        >
          Auto-fill purchase order
        </button>
        <div className="muted small">Selected: {selectedIds.length}</div>
      </div>
      <div className="card stack">
        <h3 className="section-title">Pick list / Purchase order</h3>
        {selectedProducts.length === 0 ? (
          <EmptyState title="No items" description="Select items to build a pick list." />
        ) : (
          <div className="stack">
            <div className="small muted">Generated list</div>
            <table className="table">
              <thead>
                <tr>
                  <th>Item</th>
                  <th>SKU</th>
                  <th>Qty on hand</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {selectedProducts.map((product) => (
                  <tr key={product.id}>
                    <td>{product.name}</td>
                    <td className="muted">{product.sku}</td>
                    <td>{product.quantity_on_hand}</td>
                    <td>
                      {product.quantity_on_hand <= product.reorder_point ? (
                        <span className="badge warning">Reorder</span>
                      ) : (
                        <span className="badge success">Ok</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
