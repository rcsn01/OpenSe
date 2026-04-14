import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { PurchaseOrdersTab } from '../components/Procurement/PurchaseOrdersTab'
import { SuppliersTab } from '../components/Procurement/SuppliersTab'

const procurementTabs = [
  'purchase-orders',
  'suppliers',
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
            Manage purchase orders and suppliers from a single queue. Request approval, receiving progress, and return status now surface directly on each purchase order.
          </p>
        </div>

        <Tabs tabs={tabs} activeTab={activeTab} onTabChange={(nextTab) => navigate(`/procurement/${nextTab}`)} />
      </div>
    </BasePage>
  )
}