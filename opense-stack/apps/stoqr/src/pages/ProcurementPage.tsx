import { useMemo } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { PurchaseOrdersTab } from '../components/Procurement/PurchaseOrdersTab'
import { ReceivingWorkflowTab } from '../components/Procurement/ReceivingWorkflowTab'
import { OrderTrackingTab } from '../components/Procurement/OrderTrackingTab'
import { OrderHistoryTab } from '../components/Procurement/OrderHistoryTab'
import { SuppliersTab } from '../components/Procurement/SuppliersTab'
import { useProcurementProducts } from '../hooks/queries/useProcurement'

export const ProcurementPage = () => {
  const { companyId } = useCompany()
  const { data: products = [], isLoading } = useProcurementProducts(companyId)

  const tabs = useMemo(() => {
    if (!companyId) {
      return [
        {
          id: 'purchase-orders',
          label: 'Purchase Orders',
          content: <div className="empty-state">Select a company to manage procurement workflows.</div>,
        },
      ]
    }

    return [
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        content: <PurchaseOrdersTab companyId={companyId} products={products} />,
      },
      {
        id: 'suppliers',
        label: 'Supplier Management',
        content: <SuppliersTab companyId={companyId} />,
      },
      {
        id: 'order-tracking',
        label: 'Order Tracking',
        content: <OrderTrackingTab companyId={companyId} />,
      },
      {
        id: 'receiving-workflow',
        label: 'Receiving Workflow',
        content: <ReceivingWorkflowTab companyId={companyId} />,
      },
      {
        id: 'order-history',
        label: 'Order History',
        content: <OrderHistoryTab companyId={companyId} />,
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