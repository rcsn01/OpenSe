import { useEffect, useMemo, useState } from 'react'
import { supabase, db } from '../../supabaseClient'
import { useCompany } from '../../contexts/CompanyContext'
import type { Product } from '../../types'
import { EmptyState } from '../EmptyState'
import { toast } from 'sonner'

export const ItemLabelsTab = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [quantities, setQuantities] = useState<Record<string, number>>({})
  const [search, setSearch] = useState('')
  const [isLoading, setIsLoading] = useState(true)
  const [viewMode, setViewMode] = useState<'single' | 'sheet'>('single')

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

  const updateQuantity = (id: string, next: number) => {
    setQuantities((prev) => ({ ...prev, [id]: Math.max(1, next) }))
  }

  const labelQueue = selectedProducts.flatMap((product) => {
    const qty = quantities[product.id] ?? 1
    return Array.from({ length: qty }).map((_, index) => ({
      id: `${product.id}-${index}`,
      product
    }))
  })

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
                {selectedIds.includes(product.id) && (
                  <div className="row" style={{ marginLeft: 'auto' }}>
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() => updateQuantity(product.id, (quantities[product.id] ?? 1) - 1)}
                    >
                      −
                    </button>
                    <input
                      className="input small"
                      type="number"
                      min={1}
                      value={quantities[product.id] ?? 1}
                      onChange={(e) => updateQuantity(product.id, Number(e.target.value) || 1)}
                      style={{ width: 64, textAlign: 'center' }}
                    />
                    <button
                      type="button"
                      className="button ghost small"
                      onClick={() => updateQuantity(product.id, (quantities[product.id] ?? 1) + 1)}
                    >
                      +
                    </button>
                  </div>
                )}
              </label>
            ))}
          </div>
        )}
        <button
          className="button"
          type="button"
          onClick={() => toast.success('Labels added to the queue')}
          disabled={selectedIds.length === 0}
        >
          Add to queue
        </button>
        <div className="muted small">Selected: {selectedIds.length}</div>
      </div>
      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Label preview</h3>
          <div className="row">
            <button
              className={`button ghost small ${viewMode === 'single' ? 'active' : ''}`}
              type="button"
              onClick={() => setViewMode('single')}
            >
              Single Label View
            </button>
            <button
              className={`button ghost small ${viewMode === 'sheet' ? 'active' : ''}`}
              type="button"
              onClick={() => setViewMode('sheet')}
            >
              Sheet View
            </button>
          </div>
        </div>
        {selectedProducts.length === 0 ? (
          <EmptyState title="No labels" description="Select items to generate labels." />
        ) : (
          <div className={viewMode === 'sheet' ? 'label-sheet-grid' : 'label-grid'}>
            {labelQueue.map(({ id, product }) => (
              <div key={id} className="label-card" style={{ padding: viewMode === 'sheet' ? 10 : 16 }}>
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
