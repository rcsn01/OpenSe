import { useNavigate, useParams } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { StockHealthValuationTab } from '../components/Reports/StockHealthValuationTab'
import { MovementVelocityTab } from '../components/Reports/MovementVelocityTab'
import { ProcurementSuppliersTab } from '../components/Reports/ProcurementSuppliersTab'
import { AuditsShrinkageTab } from '../components/Reports/AuditsShrinkageTab'
import { CustomSavedReportsTab } from '../components/Reports/CustomSavedReportsTab'

export const ReportsPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['stock-health', 'movement-velocity', 'procurement-suppliers', 'audits-shrinkage', 'custom-saved'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'stock-health'

  return (
    <BasePage companyId={companyId}>
      <Tabs
        activeTab={activeTab}
        onTabChange={(nextTab) => navigate(`/reports/${nextTab}`)}
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
    </BasePage>
  )
}