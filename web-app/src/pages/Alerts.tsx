import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import type { Product } from '../types'
import { EmptyState } from '../components/EmptyState'
import { ExpiryList } from '../components/Alerts/ExpiryList'
import { LowStockList } from '../components/Alerts/LowStockList'

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
      <LowStockList products={lowStock} />
      <ExpiryList products={expiring} />
    </div>
  )
}
