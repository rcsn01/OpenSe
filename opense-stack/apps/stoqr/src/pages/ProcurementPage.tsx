import { useEffect, useMemo } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, EmptyState } from '@repo/ui'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { IncomingReceivingTab } from '../components/Procurement/IncomingReceivingTab'
import { PurchaseOrdersTab } from '../components/Procurement/PurchaseOrdersTab'
import { SuppliersTab } from '../components/Procurement/SuppliersTab'

const procurementTabs = [
  'purchase-orders',
  'suppliers',
  'incoming-receiving',
  'purchase-requests',
  'vendor-returns',
] as const

type ProcurementTabId = (typeof procurementTabs)[number]

const placeholderCopy: Record<Exclude<ProcurementTabId, 'purchase-orders' | 'suppliers' | 'incoming-receiving'>, { title: string; description: string }> = {
  'purchase-requests': {
    title: 'Purchase Requests',
    description: 'Internal request intake and approval routing will be added here.',
  },
  'vendor-returns': {
    title: 'Vendor Returns',
    description: 'RMA tracking and vendor return workflows will be added here.',
  },
}

const ProcurementPlaceholderTab = ({ title, description }: { title: string; description: string }) => (
  <Card className="mt-6 overflow-hidden" padding="none">
    <CardHeader className="border-b border-[var(--color-border)] px-6 py-5">
      <CardTitle className="text-lg">{title}</CardTitle>
      <CardDescription>{description}</CardDescription>
    </CardHeader>
    <CardContent className="px-6 py-10">
      <EmptyState
        title="Coming soon"
        description="This procurement surface is intentionally empty for now while the new workflow is being wired in."
      />
    </CardContent>
  </Card>
)

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
        content: <ProcurementPlaceholderTab {...placeholderCopy['purchase-requests']} />,
      },
      {
        id: 'vendor-returns',
        label: 'Vendor Returns',
        content: <ProcurementPlaceholderTab {...placeholderCopy['vendor-returns']} />,
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