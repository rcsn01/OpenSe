import { useEffect } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { PageAvailabilityGuard } from '../components/PageAvailabilityGuard'
import { Tabs } from '../components/Tabs'
import { StockHealthValuationTab } from '../components/Reports/StockHealthValuationTab'
import { MovementVelocityTab } from '../components/Reports/MovementVelocityTab'
import { ProcurementSuppliersTab } from '../components/Reports/ProcurementSuppliersTab'
import { AuditsShrinkageTab } from '../components/Reports/AuditsShrinkageTab'
import { CustomSavedReportsTab } from '../components/Reports/CustomSavedReportsTab'
import type { AppLayoutOutletContext } from '../layouts/AppLayout'

export const ReportsPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['stock-health', 'movement-velocity', 'procurement-suppliers', 'audits-shrinkage', 'custom-saved'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'stock-health'

  useEffect(() => {
    const tabSuggestions = [
      { id: 'report-stock-health', title: 'Stock Health & Valuation', subtitle: 'Inventory value, aging, and folder mix', value: 'stock health valuation', badge: 'Report', tabId: 'stock-health' },
      { id: 'report-movement', title: 'Movement & Velocity', subtitle: 'Inbound, outbound, and top-moving SKUs', value: 'movement velocity', badge: 'Report', tabId: 'movement-velocity' },
      { id: 'report-procurement', title: 'Procurement & Suppliers', subtitle: 'Supplier and purchasing insights', value: 'procurement suppliers', badge: 'Report', tabId: 'procurement-suppliers' },
      { id: 'report-audits', title: 'Audits & Shrinkage', subtitle: 'Audit findings and shrink trends', value: 'audits shrinkage', badge: 'Report', tabId: 'audits-shrinkage' },
      { id: 'report-custom', title: 'Custom & Saved Reports', subtitle: 'Templates and scheduled delivery', value: 'custom saved reports', badge: 'Report', tabId: 'custom-saved' },
    ]

    layoutContext?.setTopBarSearchConfig({
      suggestions: tabSuggestions,
      onSuggestionSelect: (suggestion) => {
        const matchedSuggestion = tabSuggestions.find((item) => item.id === suggestion.id)
        if (matchedSuggestion) {
          navigate(`/reports/${matchedSuggestion.tabId}`)
        }
      },
    })
  }, [layoutContext, navigate])

  return (
    <BasePage companyId={companyId}>
      <PageAvailabilityGuard companyId={companyId} feature="reports">
        <Tabs
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/reports/${nextTab}`)}
          bottomSpacing
          tabs={[
            {
              id: 'stock-health',
              label: 'Stock Health & Valuation',
              content: <StockHealthValuationTab companyId={companyId} />,
            },
            {
              id: 'movement-velocity',
              label: 'Movement & Velocity',
              content: <MovementVelocityTab companyId={companyId} />,
            },
            {
              id: 'procurement-suppliers',
              label: 'Procurement & Suppliers',
              content: <ProcurementSuppliersTab companyId={companyId} />,
            },
            {
              id: 'audits-shrinkage',
              label: 'Audits & Shrinkage',
              content: <AuditsShrinkageTab companyId={companyId} />,
            },
            {
              id: 'custom-saved',
              label: 'Custom & Saved Reports',
              content: <CustomSavedReportsTab companyId={companyId} />,
            },
          ]}
        />
      </PageAvailabilityGuard>
    </BasePage>
  )
}
