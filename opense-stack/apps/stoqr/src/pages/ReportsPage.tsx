import { useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { useReportsData } from '../hooks/queries/useReports'
import { InventoryValuationTab } from '../components/Reports/InventoryValuationTab'
import { StockMovementUsageTab } from '../components/Reports/StockMovementUsageTab'
import { ReorderDeadStockTab } from '../components/Reports/ReorderDeadStockTab'
import { ExportsTab } from '../components/Reports/ExportsTab'

export const ReportsPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['valuation', 'movement-usage', 'reorder-dead-stock', 'exports'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'valuation'
  const { data, isLoading } = useReportsData(companyId)
  const [startDate, setStartDate] = useState('')
  const [endDate, setEndDate] = useState('')

  const products = data?.products ?? []
  const transactions = data?.transactions ?? []
  const series = data?.series ?? []

  const filteredTransactions = useMemo(() => {
    if (!startDate && !endDate) return transactions

    const start = startDate ? new Date(startDate).getTime() : Number.NEGATIVE_INFINITY
    const end = endDate ? new Date(endDate).getTime() + 24 * 60 * 60 * 1000 - 1 : Number.POSITIVE_INFINITY

    return transactions.filter((transaction) => {
      const time = new Date(transaction.created_at).getTime()
      return time >= start && time <= end
    })
  }, [transactions, startDate, endDate])

  return (
    <BasePage companyId={companyId} isLoading={isLoading}>
      <div className="card stack" style={{ marginBottom: 16 }}>
        <h1 style={{ margin: 0 }}>Reports</h1>
        <div className="small muted">Custom date ranges apply across all report tabs.</div>
        <div className="row" style={{ gap: 12, flexWrap: 'wrap' }}>
          <label className="stack">
            Start Date
            <input className="input" type="date" value={startDate} onChange={(event) => setStartDate(event.target.value)} />
          </label>
          <label className="stack">
            End Date
            <input className="input" type="date" value={endDate} onChange={(event) => setEndDate(event.target.value)} />
          </label>
          <button className="button ghost" onClick={() => {
            setStartDate('')
            setEndDate('')
          }}>
            Reset Range
          </button>
        </div>
      </div>
      <Tabs
      activeTab={activeTab}
      onTabChange={(nextTab) => navigate(`/reports/${nextTab}`)}
      tabs={[
        {
          id: 'valuation',
          label: 'Inventory Valuation',
          content: <InventoryValuationTab series={series} filteredTransactions={filteredTransactions} />,
        },
        {
          id: 'movement-usage',
          label: 'Stock Movement & Usage',
          content: <StockMovementUsageTab transactions={filteredTransactions} />,
        },
        {
          id: 'reorder-dead-stock',
          label: 'Reorder & Dead Stock',
          content: <ReorderDeadStockTab products={products} transactions={transactions} startDate={startDate} endDate={endDate} />,
        },
        {
          id: 'exports',
          label: 'Exports',
          content: <ExportsTab products={products} transactions={filteredTransactions} startDate={startDate} endDate={endDate} />,
        },
      ]}
      />
    </BasePage>
  )
}