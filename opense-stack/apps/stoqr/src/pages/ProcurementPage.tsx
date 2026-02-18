import { useMemo } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { PurchaseOrdersTab } from '../components/Procurement/PurchaseOrdersTab'
import { ReceivingLogTab } from '../components/Procurement/ReceivingLogTab'
import { ReplenishmentTab } from '../components/Procurement/ReplenishmentTab'
import { SuppliersTab } from '../components/Procurement/SuppliersTab'
import { useProcurementProducts } from '../hooks/queries/useProcurement'

export const ProcurementPage = () => {
  const { companyId } = useCompany()
  const { data: products = [], isLoading } = useProcurementProducts(companyId)

  const tabs = useMemo(() => {
    if (!companyId) {
      return [
        {
          id: 'replenishment',
          label: 'Replenishment',
          content: <ReplenishmentTab products={products} isLoading={isLoading} />,
        },
      ]
    }

    return [
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
    ]
  }, [companyId, products, isLoading])

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage procurement."
    >
      <Tabs tabs={tabs} />
    </BasePage>
  )
}