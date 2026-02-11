import { useEffect, useState } from 'react'
import { supabase, db } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import type { Product } from '../types'
import { PurchaseOrdersTab } from '../components/Procurement/PurchaseOrdersTab'
import { ReceivingLogTab } from '../components/Procurement/ReceivingLogTab'
import { ReplenishmentTab } from '../components/Procurement/ReplenishmentTab'
import { SuppliersTab } from '../components/Procurement/SuppliersTab'

export const ProcurementPage = () => {
  const { companyId } = useCompany()
  const [products, setProducts] = useState<Product[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!companyId) return
      setIsLoading(true)
      const { data } = await supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, reorder_point')
        .eq('company_id', companyId)
        .order('name')

      setProducts((data as Product[]) ?? [])
      setIsLoading(false)
    }
    load()
  }, [companyId])

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage procurement."
    >
      <Tabs
        tabs={[
          {
            id: 'replenishment',
            label: 'Replenishment',
            content: <ReplenishmentTab products={products} isLoading={isLoading} />,
          },
          {
            id: 'pos',
            label: 'Purchase Orders',
            content: <PurchaseOrdersTab companyId={companyId} />,
          },
          {
            id: 'suppliers',
            label: 'Suppliers',
            content: <SuppliersTab companyId={companyId} />,
          },
          {
            id: 'receiving',
            label: 'Receiving Log',
            content: <ReceivingLogTab companyId={companyId} />,
          },
        ]}
      />
    </BasePage>
  )
}