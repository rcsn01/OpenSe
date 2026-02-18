import { useMemo } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { ExpiryList } from '../components/Alerts/ExpiryList'
import { LowStockList } from '../components/Alerts/LowStockList'
import { useAlertProducts } from '../hooks/queries/useAlerts'

const DAYS_NOTICE = 30

export const AlertsPage = () => {
  const { companyId } = useCompany()
  const { data: products = [], isLoading } = useAlertProducts(companyId)

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

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to view alerts."
      containerClassName="grid grid-2"
    >
      <LowStockList products={lowStock} />
      <ExpiryList products={expiring} />
    </BasePage>
  )
}
