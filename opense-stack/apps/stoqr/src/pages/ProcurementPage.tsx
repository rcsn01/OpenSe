import { useEffect, useMemo } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { PageAvailabilityGuard } from '../components/PageAvailabilityGuard'
import { Tabs } from '../components/Tabs'
import { PurchaseOrdersTab } from '../components/Procurement/PurchaseOrdersTab'
import { SuppliersTab } from '../components/Procurement/SuppliersTab'
import type { AppLayoutOutletContext } from '../layouts/AppLayout'

const procurementTabs = [
  'purchase-orders',
  'suppliers',
] as const

type ProcurementTabId = (typeof procurementTabs)[number]

export const ProcurementPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { tab } = useParams<{ tab?: string }>()
  const isValidTab = procurementTabs.includes((tab ?? '') as ProcurementTabId)
  const activeTab: ProcurementTabId = isValidTab ? (tab as ProcurementTabId) : 'purchase-orders'
  const purchaseOrderSearchTerm = activeTab === 'purchase-orders' ? (layoutContext?.topBarSearchValue ?? '') : ''
  const supplierSearchTerm = activeTab === 'suppliers' ? (layoutContext?.topBarSearchValue ?? '') : ''

  useEffect(() => {
    if (tab && !isValidTab) {
      navigate('/procurement/purchase-orders', { replace: true })
    }
  }, [isValidTab, navigate, tab])

  const tabs = useMemo(() => {
    return [
      {
        id: 'purchase-orders',
        label: 'Purchase Orders',
        content: <PurchaseOrdersTab companyId={companyId} searchTerm={purchaseOrderSearchTerm} />,
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        content: <SuppliersTab companyId={companyId} searchTerm={supplierSearchTerm} />,
      },
    ]
  }, [companyId, purchaseOrderSearchTerm, supplierSearchTerm])

  return (
    <BasePage
      companyId={companyId}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage procurement."
    >
      <PageAvailabilityGuard companyId={companyId} feature="procurement">
        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(nextTab) => navigate(`/procurement/${nextTab}`)} bottomSpacing />
      </PageAvailabilityGuard>
    </BasePage>
  )
}
