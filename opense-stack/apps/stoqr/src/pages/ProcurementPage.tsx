import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { IncomingReceivingTab } from '../components/Procurement/IncomingReceivingTab'
import { PurchaseOrdersTab } from '../components/Procurement/PurchaseOrdersTab'
import { PurchaseRequestsTab } from '../components/Procurement/PurchaseRequestsTab'
import { SuppliersTab } from '../components/Procurement/SuppliersTab'
import { VendorReturnsTab } from '../components/Procurement/VendorReturnsTab'

const procurementTabs = [
  'purchase-orders',
  'suppliers',
  'incoming-receiving',
  'purchase-requests',
  'vendor-returns',
] as const

type ProcurementTabId = (typeof procurementTabs)[number]

export const ProcurementPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const isValidTab = procurementTabs.includes((tab ?? '') as ProcurementTabId)
  const activeTab: ProcurementTabId = isValidTab ? (tab as ProcurementTabId) : 'purchase-orders'

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
        content: <PurchaseOrdersTab companyId={companyId} />,
      },
      {
        id: 'suppliers',
        label: 'Suppliers',
        content: <SuppliersTab companyId={companyId} />,
      },
      {
        id: 'incoming-receiving',
        label: 'Incoming / Receiving',
        content: <IncomingReceivingTab companyId={companyId} />,
      },
      {
        id: 'purchase-requests',
        label: 'Purchase Requests',
        content: <PurchaseRequestsTab companyId={companyId} />,
      },
      {
        id: 'vendor-returns',
        label: 'Vendor Returns',
        content: <VendorReturnsTab companyId={companyId} />,
      },
    ]
  }, [companyId])

  return (
    <BasePage
      companyId={companyId}
      emptyStateTitle="No company selected"
      emptyStateDescription="Select a company to manage procurement."
    >
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="page-title">Procurement</h1>
          <p className="max-w-3xl text-sm text-[var(--color-muted-foreground)]">
            Manage purchase orders, supplier intake, incoming receiving, and return workflows from a single queue.
          </p>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(nextTab) => navigate(`/procurement/${nextTab}`)} />
      </div>
    </BasePage>
  )
}