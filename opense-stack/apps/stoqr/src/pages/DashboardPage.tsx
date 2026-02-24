import { Link } from 'react-router-dom'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Label, StackLayout } from '@repo/ui'
import { RecentActivity } from '../components/dashboard/RecentActivity'
import { StatsCards } from '../components/dashboard/StatsCards'
import { StockHealth } from '../components/dashboard/StockHealth'
import { TopMovers } from '../components/dashboard/TopMovers'
import { ValuationChart } from '../components/dashboard/ValuationChart'
import { UsageChart } from '../components/dashboard/UsageChart'
import { AlertsSummary } from '../components/dashboard/AlertsSummary'
import { useDashboard } from '../hooks/queries/useDashboard'

// --- Main Component ---

export const DashboardPage = () => {
  const { companyId } = useCompany()
  const { data, isLoading, isFetching, isError, error } = useDashboard(companyId)

  const shouldShowLoading = isLoading || (isFetching && !data)

  return (
    <BasePage
      companyId={companyId}
      isLoading={shouldShowLoading}
      emptyStateTitle="Welcome to Fill The Shelf"
      emptyStateDescription="Select or create a company to get started."
      loadingMessage="Loading dashboard..."
    >
      {isError ? (
      <div className="empty-state">
        {error instanceof Error ? error.message : 'Failed to load dashboard data.'}
      </div>
      ) : data ? (
      <div className="stack">
      {/* Quick Actions */}
      <div className="flex-between">
        <Label className="section-title">Overview</Label>
        <div className="row">
          <Link to="/inventory" className="button secondary small">Add Product</Link>
          <Link to="/procurement" className="button secondary small">Create Order</Link>
          <Link to="/scan" className="button small">Scan Item</Link>
        </div>
      </div>

      {/* KPI Cards */}
      <StatsCards
        totalValue={data.totalValue}
        totalStockUnits={data.totalStockUnits}
        lowStockCount={data.lowStockCount}
        pendingOrders={data.pendingOrders}
      />

      <StackLayout variant="grid-2">
        {/* Valuation Chart */}
        <ValuationChart chartData={data.chartData} />

        {/* Usage Trend Chart */}
        <UsageChart chartData={data.usageChartData} />

        {/* Stock Health */}
        <StockHealth
          totalProducts={data.products.length}
          lowStockCount={data.lowStockCount}
          outOfStockCount={data.outOfStockCount}
        />

        {/* Alerts Summary */}
        <AlertsSummary summary={data.alertsSummary} />

        {/* Top Selling Products */}
        <TopMovers topMovers={data.topMovers} />

        {/* Recent Activity */}
        <RecentActivity transactions={data.transactions} />
      </StackLayout>
      </div>
      ) : (
      <div className="empty-state">No dashboard data available.</div>
      )}
    </BasePage>
  )
}