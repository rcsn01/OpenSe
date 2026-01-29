import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { Product } from '../types'
import { EmptyState } from '../components/EmptyState'

const DAYS_NOTICE = 30

export const Alerts = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  const loadProducts = async () => {
    if (!companyId) return
    setIsLoading(true)

    const { data, error } = await supabase
      .from('products')
      .select('id, name, sku, quantity_on_hand, reorder_point, expiry_date')
      .eq('company_id', companyId)

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
  }, [companyId])

  const lowStock = useMemo(() => {
    return products.filter((product) => product.quantity_on_hand <= product.reorder_point)
  }, [products])

  const expiring = useMemo(() => {
    const now = new Date()
    const cutoff = new Date()
    cutoff.setDate(cutoff.getDate() + DAYS_NOTICE)
    return products.filter((product) => {
      if (!product.expiry_date) return false
      const expiry = new Date(product.expiry_date)
      return expiry >= now && expiry <= cutoff
    })
  }, [products])

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to view alerts." />
  }

  if (isLoading) {
    return <div className="empty-state">Loading alerts...</div>
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h3 className="section-title">Low stock</h3>
          <span className="pill">{lowStock.length} items</span>
        </div>
        {lowStock.length === 0 ? (
          <EmptyState title="All clear" description="No items need reorder." />
        ) : (
          <div className="list">
            {lowStock.map((product) => (
              <div key={product.id} className="flex-between">
                <div>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div className="small muted">SKU {product.sku}</div>
                </div>
                <span className="badge warning">{product.quantity_on_hand} left</span>
              </div>
            ))}
          </div>
        )}
      </div>
      <div className="card">
        <div className="flex-between" style={{ marginBottom: 12 }}>
          <h3 className="section-title">Expiry alerts</h3>
          <span className="pill">{expiring.length} items</span>
        </div>
        {expiring.length === 0 ? (
          <EmptyState title="No expirations" description="No items expiring in the next 30 days." />
        ) : (
          <div className="list">
            {expiring.map((product) => (
              <div key={product.id} className="flex-between">
                <div>
                  <div style={{ fontWeight: 600 }}>{product.name}</div>
                  <div className="small muted">SKU {product.sku}</div>
                </div>
                <span className="badge danger">{product.expiry_date}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
