import {
  AnalyticsBarChart,
  AnalyticsDonutChart,
  AnalyticsLineChart,
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  AnalyticsPanel,
  Badge,
} from '@repo/ui'
import { OpenKbPageShell } from '../../components/OpenKbPageShell'
import { useOrganisation } from '../../contexts/OrganisationContext'
import { useAnalyticsSummary } from '../../hooks/queries/useAnalytics'

const percent = (value: number, total: number) =>
  total > 0 ? `${Math.round((value / total) * 100)}%` : '0%'

const toChartData = (items: Array<{ label: string; value: number; color?: string }>) =>
  items.map((item) => ({
    name: item.label,
    value: item.value,
    color: item.color ?? '#64748b',
  }))

export const AnalyticsPage = () => {
  const { organisationId, organisationName } = useOrganisation()
  const { data: summary, isLoading } = useAnalyticsSummary(organisationId)

  const priorityData = toChartData(summary?.issues_by_priority ?? [])
  const stateData = toChartData(summary?.issues_by_state ?? [])
  const projectData = toChartData(summary?.issues_by_project ?? [])
  const dueBucketData = toChartData(summary?.issues_by_due_bucket ?? [])
  const deliveryTrend = (summary?.issue_creation_trend ?? []).map((point, index) => ({
    ...point,
    completed: summary?.issue_completion_trend[index]?.completed ?? 0,
  }))
  const priorityColors = priorityData.map((item) => String(item.color))

  return (
    <OpenKbPageShell isLoading={isLoading}>
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-xl font-semibold tracking-normal">Analytics</h1>
          <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
            {organisationName ?? 'Organisation'} delivery, workload, and intake signals.
          </p>
        </div>
        <Badge variant="neutral">Organisation report</Badge>
      </div>

      <AnalyticsMetricGrid variant="stats-4">
        <AnalyticsMetricCard
          surface="card"
          label="Issues"
          value={summary?.total_issues ?? 0}
          detail={`${summary?.open_issues ?? 0} open, ${summary?.completed_issues ?? 0} completed`}
          accent={{ label: `${percent(summary?.completed_issues ?? 0, summary?.total_issues ?? 0)} complete`, tone: 'positive' }}
        />
        <AnalyticsMetricCard
          surface="card"
          label="Projects"
          value={summary?.total_projects ?? 0}
          detail={`${summary?.total_cycles ?? 0} cycles and ${summary?.total_modules ?? 0} modules`}
        />
        <AnalyticsMetricCard
          surface="card"
          label="Pages"
          value={summary?.total_pages ?? 0}
          detail="Knowledge base documents"
        />
        <AnalyticsMetricCard
          surface="card"
          label="Intake"
          value={summary?.total_intake_requests ?? 0}
          detail="Requests awaiting or completing triage"
        />
      </AnalyticsMetricGrid>

      <AnalyticsMetricGrid variant="stats-4">
        <AnalyticsMetricCard
          surface="card"
          label="Overdue"
          value={summary?.overdue_issues ?? 0}
          detail="Open issues past target date"
          accent={{ label: `${percent(summary?.overdue_issues ?? 0, summary?.open_issues ?? 0)} of open`, tone: (summary?.overdue_issues ?? 0) > 0 ? 'danger' : 'positive' }}
        />
        <AnalyticsMetricCard
          surface="card"
          label="Due soon"
          value={summary?.due_soon_issues ?? 0}
          detail="Open issues due in the next 7 days"
        />
        <AnalyticsMetricCard
          surface="card"
          label="Average completion"
          value={summary?.average_completion_days ?? 0}
          detail={summary?.average_completion_days == null ? 'No completed issue age yet' : 'Days from creation to completion'}
        />
        <AnalyticsMetricCard
          surface="card"
          label="Completion rate"
          value={percent(summary?.completed_issues ?? 0, summary?.total_issues ?? 0)}
          detail="Completed across current issue history"
        />
      </AnalyticsMetricGrid>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1.35fr)_minmax(20rem,0.65fr)]">
        <AnalyticsPanel
          surface="card"
          title="Issue creation"
          subtitle="Issues created over the last 14 days."
        >
          <AnalyticsLineChart
            data={deliveryTrend}
            xDataKey="date"
            series={[
              { dataKey: 'issues', label: 'Created', color: '#2563eb' },
              { dataKey: 'completed', label: 'Completed', color: '#16a34a' },
            ]}
            height={260}
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          surface="card"
          title="Priority mix"
          subtitle="Current issue load by priority."
        >
          <AnalyticsDonutChart
            data={priorityData}
            colors={priorityColors.length > 0 ? priorityColors : ['#64748b']}
            height={260}
          />
        </AnalyticsPanel>
      </div>

      <div className="grid gap-5 xl:grid-cols-2">
        <AnalyticsPanel
          surface="card"
          title="State distribution"
          subtitle="Current issue count by workflow state."
        >
          <AnalyticsBarChart
            data={stateData}
            categoryKey="name"
            series={[{ dataKey: 'value', label: 'Issues', color: '#0f766e' }]}
            layout="vertical"
            height={280}
            yAxisWidth={120}
            cellColors={stateData.map((item) => String(item.color))}
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          surface="card"
          title="Due-date health"
          subtitle="Open and completed issues by target-date bucket."
        >
          <AnalyticsBarChart
            data={dueBucketData}
            categoryKey="name"
            series={[{ dataKey: 'value', label: 'Issues', color: '#ca8a04' }]}
            layout="vertical"
            height={280}
            yAxisWidth={120}
            cellColors={dueBucketData.map((item) => String(item.color))}
          />
        </AnalyticsPanel>

        <AnalyticsPanel
          surface="card"
          title="Project workload"
          subtitle="Issue distribution across projects."
        >
          <AnalyticsBarChart
            data={projectData}
            categoryKey="name"
            series={[{ dataKey: 'value', label: 'Issues', color: '#7c3aed' }]}
            layout="vertical"
            height={280}
            yAxisWidth={160}
          />
        </AnalyticsPanel>
      </div>
    </OpenKbPageShell>
  )
}
