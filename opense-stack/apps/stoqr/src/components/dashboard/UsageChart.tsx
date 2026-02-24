import { useEffect, useState } from 'react'
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'

export const UsageChart = ({ chartData }: { chartData: { date: string; value: number }[] }) => {
  const [isMounted, setIsMounted] = useState(false)
  const hasData = chartData.length > 0
  const fallbackData = [
    { date: 'Day 1', value: 0 },
    { date: 'Day 4', value: 0 },
    { date: 'Day 7', value: 0 },
    { date: 'Day 10', value: 0 },
    { date: 'Day 14', value: 0 },
  ]
  const data = hasData ? chartData : fallbackData

  useEffect(() => {
    setIsMounted(true)
  }, [])

  return (
    <div className="card stack min-w-0">
      <div className="flex-between">
        <h3 className="section-title">Usage Trend (30d)</h3>
        <span className="badge neutral">Live</span>
      </div>
      <div className="muted small">Stock-out movement over time (sales/loss/scan-out).</div>
      <div style={{ height: 220, width: '100%' }}>
        {isMounted ? (
        <ResponsiveContainer width="100%" height="100%" minWidth={0} minHeight={220}>
          <AreaChart data={data} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="usage" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stopColor="#f97316" stopOpacity={0.35} />
                <stop offset="100%" stopColor="#f97316" stopOpacity={0.05} />
              </linearGradient>
            </defs>
            <CartesianGrid stroke="#e2e8f0" strokeDasharray="3 3" vertical={false} />
            <XAxis dataKey="date" tick={{ fontSize: 12 }} tickLine={false} axisLine={false} />
            <YAxis tick={{ fontSize: 12 }} tickLine={false} axisLine={false} width={40} />
            {hasData && <Tooltip formatter={(value) => [Number(value).toLocaleString(), 'Usage']} />}
            <Area
              type="monotone"
              dataKey="value"
              stroke={hasData ? '#f97316' : '#fed7aa'}
              strokeDasharray={hasData ? undefined : '4 4'}
              fill={hasData ? 'url(#usage)' : 'transparent'}
              strokeWidth={2}
            />
          </AreaChart>
        </ResponsiveContainer>
        ) : null}
      </div>
      {!hasData && <div className="small muted">Projected baseline shown until data is available.</div>}
    </div>
  )
}
