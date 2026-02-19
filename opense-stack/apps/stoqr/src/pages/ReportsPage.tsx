import { useMemo } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { AuditTrailTab } from '../components/Reports/AuditTrailTab'
import { ProfitabilityTab } from '../components/Reports/ProfitabilityTab'
import { TurnoverTab } from '../components/Reports/TurnoverTab'
import { ValuationTab } from '../components/Reports/ValuationTab'
import { useReportsData, useReportsRefresh } from '../hooks/queries/useReports'

export const ReportsPage = () => {
  const { companyId } = useCompany()
  const { data, isLoading } = useReportsData(companyId)
  const refreshReports = useReportsRefresh(companyId)

  const products = data?.products ?? []
  const transactions = data?.transactions ?? []
  const schedules = data?.schedules ?? []
  const series = data?.series ?? []

  // Avg Inventory Value for Turnover Calculation
  const avgValue = useMemo(() => {
    if (series.length === 0) return 0
    const sum = series.reduce((acc, s) => acc + s.value, 0)
    return sum / series.length
  }, [series])

  return (
    <BasePage companyId={companyId} isLoading={isLoading}>
      <Tabs
      tabs={[
        {
          id: 'valuation',
          label: 'Inventory Valuation',
          content: <ValuationTab series={series} schedules={schedules} companyId={companyId!} onScheduleChange={refreshReports} />,
        },
        {
          id: 'profit',
          label: 'COGS & Profitability',
          content: <ProfitabilityTab transactions={transactions} />,
        },
        {
          id: 'turnover',
          label: 'Inventory Turnover',
          content: <TurnoverTab transactions={transactions} products={products} avgInventoryValue={avgValue} />,
        },
        {
          id: 'audit',
          label: 'Audit Trail',
          content: <AuditTrailTab transactions={transactions} />,
        },
      ]}
      />
    </BasePage>
  )
}