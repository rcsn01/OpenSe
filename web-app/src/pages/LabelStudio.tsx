import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { Product } from '../types'
import { EmptyState } from '../components/EmptyState'

export const LabelStudio = () => {
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
      .select('id, name, sku')
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

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to print labels." />
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
          Print labels
        </button>
        <div className="muted small">Selected: {selectedIds.length}</div>
      </div>
      <div className="card stack">
        <h3 className="section-title">Label preview</h3>
        {selectedProducts.length === 0 ? (
          <EmptyState title="No labels" description="Select items to generate labels." />
        ) : (
          <div className="label-grid">
            {selectedProducts.map((product) => (
              <div key={product.id} className="label-card">
                <div style={{ fontWeight: 700 }}>{product.name}</div>
                <div className="small muted">SKU {product.sku}</div>
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=120x120&data=${encodeURIComponent(
                    product.sku,
                  )}`}
                  alt="QR"
                />
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
