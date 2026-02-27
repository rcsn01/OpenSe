import { useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
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
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['purchase-orders', 'suppliers', 'order-tracking', 'receiving-workflow', 'order-history'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'purchase-orders'
  const { data: products = [], isLoading } = useProcurementProducts(companyId)

  const tabs = useMemo(() => {
    if (!companyId) {
      const emptyState = <div className="empty-state">Select a company to manage procurement workflows.</div>
      return [
        {
          id: 'purchase-orders',
          label: 'Purchase Orders',
          content: emptyState,
        },
        {
          id: 'suppliers',
          label: 'Supplier Management',
          content: emptyState,
        },
        {
          id: 'order-tracking',
          label: 'Order Tracking',
          content: emptyState,
        },
        {
          id: 'receiving-workflow',
          label: 'Receiving Workflow',
          content: emptyState,
        },
        {
          id: 'order-history',
          label: 'Order History',
          content: emptyState,
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
  }, [companyId, products])

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage procurement."
    >
      <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(nextTab) => navigate(`/procurement/${nextTab}`)} />
    </BasePage>
  )
}