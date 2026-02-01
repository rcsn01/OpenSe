import { SimpleLineChart } from '../SimpleLineChart'

export const ValuationChart = ({ chartData }: { chartData: { date: string; value: number }[] }) => {
  return (
    <div className="card stack">
      <div className="flex-between">
        <h3 className="section-title">Valuation Trend (14d)</h3>
        <span className="badge success">Live</span>
      </div>
      <div className="muted small">Net inventory value based on cost price over time.</div>
      <SimpleLineChart data={chartData} />
    </div>
  )
}
