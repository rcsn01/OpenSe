import { useEffect, useMemo, useState } from 'react'
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import { useReportsData } from '../../hooks/queries/useReports'
import { formatDateTime } from '../../utils'

type RangeKey = '7d' | '30d' | 'quarter' | 'custom'

const RANGE_LABELS: Record<string, string> = {
  '7d': '7 Days',
  '30d': '30 Days',
  quarter: 'This Quarter',
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

const getQuarterStart = () => {
  const now = new Date()
  const q = Math.floor(now.getMonth() / 3)
  return new Date(now.getFullYear(), q * 3, 1).getTime()
}

const getRangeCutoff = (range: RangeKey, customStart?: string, customEnd?: string) => {
  const now = Date.now()
  if (range === '7d') return { start: now - 7 * 86_400_000, end: now }
  if (range === '30d') return { start: now - 30 * 86_400_000, end: now }
  if (range === 'quarter') return { start: getQuarterStart(), end: now }
  return {
    start: customStart ? new Date(customStart).getTime() : now - 7 * 86_400_000,
    end: customEnd ? new Date(customEnd).getTime() + 86_400_000 - 1 : now,
  }
}

const formatRelative = (iso: string) => {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60_000)
  if (mins < 60) return `${mins}m ago`
  const hours = Math.floor(mins / 60)
  if (hours < 24) return `${hours} hour${hours > 1 ? 's' : ''} ago`
  const days = Math.floor(hours / 24)
  return `${days} day${days > 1 ? 's' : ''} ago`
}

export const MovementVelocityTab = ({ companyId }: { companyId: string | null }) => {
  const { data } = useReportsData(companyId)
  const [isMounted, setIsMounted] = useState(false)
  const [range, setRange] = useState<RangeKey>('7d')
  const [customStart, setCustomStart] = useState('')
  const [customEnd, setCustomEnd] = useState('')
  const [showCustom, setShowCustom] = useState(false)

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const transactions = data?.transactions ?? []

  const { start, end } = useMemo(
    () => getRangeCutoff(range, customStart, customEnd),
    [range, customStart, customEnd],
  )

  const filtered = useMemo(
    () =>
      transactions.filter((t) => {
        const time = new Date(t.created_at).getTime()
        return time >= start && time <= end
      }),
    [transactions, start, end],
  )

  // Inbound / outbound totals
  const inboundTotal = useMemo(
    () => filtered.filter((t) => t.quantity_change > 0).reduce((s, t) => s + t.quantity_change, 0),
    [filtered],
  )

  const outboundTotal = useMemo(
    () =>
      filtered
        .filter((t) => t.quantity_change < 0)
        .reduce((s, t) => s + Math.abs(t.quantity_change), 0),
    [filtered],
  )

  // Return rate
  const returnCount = useMemo(
    () =>
      filtered
        .filter((t) => t.transaction_type.toLowerCase() === 'return')
        .reduce((s, t) => s + Math.abs(t.quantity_change), 0),
    [filtered],
  )
  const returnRate = outboundTotal > 0 ? ((returnCount / outboundTotal) * 100).toFixed(1) : '0.0'

  // Sparkline data (last 7 data points for stat cards)
  const inboundSparkline = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const t of filtered) {
      if (t.quantity_change <= 0) continue
      const day = new Date(t.created_at).toISOString().split('T')[0]
      buckets.set(day, (buckets.get(day) ?? 0) + t.quantity_change)
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([, v]) => v)
  }, [filtered])

  const outboundSparkline = useMemo(() => {
    const buckets = new Map<string, number>()
    for (const t of filtered) {
      if (t.quantity_change >= 0) continue
      const day = new Date(t.created_at).toISOString().split('T')[0]
      buckets.set(day, (buckets.get(day) ?? 0) + Math.abs(t.quantity_change))
    }
    return Array.from(buckets.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .slice(-7)
      .map(([, v]) => v)
  }, [filtered])

  // Line chart: Inbound vs Outbound by day-of-week or date
  const chartData = useMemo(() => {
    const inMap = new Map<string, number>()
    const outMap = new Map<string, number>()

    for (const t of filtered) {
      const day = new Date(t.created_at).toISOString().split('T')[0]
      if (t.quantity_change > 0) {
        inMap.set(day, (inMap.get(day) ?? 0) + t.quantity_change)
      } else {
        outMap.set(day, (outMap.get(day) ?? 0) + Math.abs(t.quantity_change))
      }
    }

    const allDays = Array.from(new Set([...inMap.keys(), ...outMap.keys()])).sort()

    if (range === '7d' && allDays.length <= 7) {
      return allDays.map((day) => ({
        label: DAY_NAMES[new Date(day).getDay()],
        inbound: inMap.get(day) ?? 0,
        outbound: outMap.get(day) ?? 0,
      }))
    }

    return allDays.map((day) => ({
      label: day.slice(5), // MM-DD
      inbound: inMap.get(day) ?? 0,
      outbound: outMap.get(day) ?? 0,
    }))
  }, [filtered, range])

  // Top moving SKUs
  const topSkus = useMemo(() => {
    const map = new Map<string, { name: string; sku: string; total: number }>()
    for (const t of filtered) {
      if (!t.products) continue
      const existing = map.get(t.products.id) ?? { name: t.products.name, sku: t.products.sku, total: 0 }
      existing.total += Math.abs(t.quantity_change)
      map.set(t.products.id, existing)
    }
    return Array.from(map.values())
      .sort((a, b) => b.total - a.total)
      .slice(0, 4)
  }, [filtered])

  // Recent transfers (most recent transactions)
  const recentTransfers = useMemo(
    () =>
      [...filtered]
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
        .slice(0, 4),
    [filtered],
  )

  const rangeLabel = range === '7d' ? 'this week' : range === '30d' ? 'this month' : 'this quarter'

  return (
    <div className="stack">
      {/* Range selector */}
      <div className="card" style={{ padding: '12px 24px' }}>
        <div className="flex-between">
          <div className="row" style={{ gap: 0 }}>
            {(['7d', '30d', 'quarter'] as const).map((key) => (
              <button
                key={key}
                className={`button ${range === key && !showCustom ? '' : 'ghost'}`}
                style={{
                  borderRadius: 'var(--radius-lg)',
                  fontSize: 'var(--type-size-sm)',
                  padding: '6px 16px',
                }}
                onClick={() => {
                  setRange(key)
                  setShowCustom(false)
                }}
              >
                {RANGE_LABELS[key]}
              </button>
            ))}
          </div>
          <button
            className={`button ${showCustom ? '' : 'ghost'}`}
            style={{ fontSize: 'var(--type-size-sm)', padding: '6px 16px', display: 'flex', alignItems: 'center', gap: 6 }}
            onClick={() => {
              setShowCustom(!showCustom)
              if (!showCustom) setRange('custom')
            }}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
              <line x1="16" y1="2" x2="16" y2="6" />
              <line x1="8" y1="2" x2="8" y2="6" />
              <line x1="3" y1="10" x2="21" y2="10" />
            </svg>
            Custom Range
          </button>
        </div>
        {showCustom && (
          <div className="row" style={{ gap: 12, marginTop: 12 }}>
            <label className="stack" style={{ gap: 4 }}>
              <span className="small muted">Start</span>
              <input className="input" type="date" value={customStart} onChange={(e) => setCustomStart(e.target.value)} />
            </label>
            <label className="stack" style={{ gap: 4 }}>
              <span className="small muted">End</span>
              <input className="input" type="date" value={customEnd} onChange={(e) => setCustomEnd(e.target.value)} />
            </label>
          </div>
        )}
      </div>

      {/* Top stat cards */}
      <div className="grid grid-3">
        {/* Inbound Volume */}
        <div className="card stat">
          <h3>Inbound Volume</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="value">{inboundTotal.toLocaleString()}</div>
            <span className="small muted">Units received {rangeLabel}</span>
          </div>
          <MiniSparkline data={inboundSparkline} color="#2563eb" />
        </div>

        {/* Outbound Volume */}
        <div className="card stat">
          <h3>Outbound Volume</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="value">{outboundTotal.toLocaleString()}</div>
            <span className="small muted">Units shipped {rangeLabel}</span>
          </div>
          <MiniSparkline data={outboundSparkline} color="var(--color-foreground)" />
        </div>

        {/* Average Return Rate */}
        <div className="card stat">
          <h3>Average Return Rate</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="value">{returnRate}%</div>
            <span className="small muted">Consistent with 30d avg</span>
          </div>
          <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
            {Array.from({ length: 7 }).map((_, i) => (
              <div
                key={i}
                style={{
                  width: 18,
                  height: 18,
                  borderRadius: 'var(--radius-sm)',
                  background: i < 5 ? 'var(--color-muted-foreground)' : 'var(--color-border)',
                  opacity: 0.6 + i * 0.05,
                }}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Inbound vs Outbound Volume chart */}
      <div className="card stack">
        <h3 className="section-title" style={{ marginBottom: 0 }}>Inbound vs. Outbound Volume</h3>
        <div style={{ display: 'flex', gap: 20, fontSize: 'var(--type-size-xs)', color: 'var(--color-muted-foreground)' }}>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: '#2563eb', display: 'inline-block' }} />
            Inbound
          </span>
          <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
            <span style={{ width: 10, height: 10, borderRadius: '50%', background: 'var(--color-foreground)', display: 'inline-block' }} />
            Outbound
          </span>
        </div>
        <div style={{ height: 280, width: '100%' }}>
          {isMounted ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={chartData} margin={{ top: 16, right: 12, left: 0, bottom: 0 }}>
                <CartesianGrid stroke="var(--color-border)" strokeDasharray="3 3" vertical={false} />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 'var(--type-size-xs)' }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 'var(--type-size-xs)' }}
                  tickLine={false}
                  axisLine={false}
                  width={40}
                />
                <Tooltip />
                <Line
                  type="monotone"
                  dataKey="inbound"
                  name="Inbound"
                  stroke="#2563eb"
                  strokeWidth={2}
                  dot={{ fill: '#fff', stroke: '#2563eb', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
                <Line
                  type="monotone"
                  dataKey="outbound"
                  name="Outbound"
                  stroke="var(--color-foreground)"
                  strokeWidth={2}
                  dot={{ fill: '#fff', stroke: 'var(--color-foreground)', strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          ) : null}
        </div>
      </div>

      {/* Bottom row: Top SKUs & Recent Transfers */}
      <div className="grid grid-2">
        {/* Top Moving SKUs */}
        <div className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="section-title">Top Moving SKUs</h3>
          </div>
          <div>
            {topSkus.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>No movement data in this range.</div>
            ) : (
              topSkus.map((sku, i) => (
                <div
                  key={sku.sku}
                  className="flex-between"
                  style={{
                    padding: '14px 24px',
                    borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'var(--type-weight-semibold)' }}>{sku.name}</div>
                    <div className="small muted">{sku.sku}</div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 'var(--type-weight-semibold)' }}>
                      {sku.total.toLocaleString()} units
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Transfers */}
        <div className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0' }}>
            <h3 className="section-title">Recent Transfers</h3>
          </div>
          <div>
            {recentTransfers.length === 0 ? (
              <div className="empty-state" style={{ padding: 32 }}>No recent transfers.</div>
            ) : (
              recentTransfers.map((t, i) => (
                <div
                  key={t.id}
                  className="flex-between"
                  style={{
                    padding: '14px 24px',
                    borderTop: i > 0 ? '1px solid var(--color-border)' : undefined,
                  }}
                >
                  <div>
                    <div style={{ fontWeight: 'var(--type-weight-semibold)' }}>
                      {Math.abs(t.quantity_change)}x {t.products?.sku ?? 'Unknown'}
                    </div>
                    <div className="small muted">
                      {t.transaction_type} · {t.products?.name ?? 'Unknown'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <span
                      className="badge"
                      style={{
                        background:
                          t.transaction_type === 'purchase' || t.transaction_type === 'scan_in'
                            ? 'rgba(22, 163, 74, 0.12)'
                            : t.transaction_type === 'return'
                              ? 'rgba(245, 158, 11, 0.16)'
                              : 'rgba(37, 99, 235, 0.12)',
                        color:
                          t.transaction_type === 'purchase' || t.transaction_type === 'scan_in'
                            ? '#166534'
                            : t.transaction_type === 'return'
                              ? '#92400e'
                              : '#1e40af',
                      }}
                    >
                      {t.transaction_type === 'purchase' || t.transaction_type === 'scan_in'
                        ? 'Completed'
                        : t.transaction_type === 'return'
                          ? 'In Transit'
                          : 'Completed'}
                    </span>
                    <div className="small muted" style={{ marginTop: 2 }}>
                      {formatRelative(t.created_at)}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

/** Tiny inline SVG sparkline for stat cards */
const MiniSparkline = ({ data, color }: { data: number[]; color: string }) => {
  if (data.length < 2) {
    return (
      <div style={{ display: 'flex', gap: 4, marginTop: 4 }}>
        {Array.from({ length: 7 }).map((_, i) => (
          <div
            key={i}
            style={{
              width: 18,
              height: 18,
              borderRadius: 'var(--radius-sm)',
              background: color,
              opacity: 0.15 + i * 0.08,
            }}
          />
        ))}
      </div>
    )
  }

  const max = Math.max(...data, 1)
  const w = 120
  const h = 30
  const step = w / (data.length - 1)
  const points = data.map((v, i) => `${i * step},${h - (v / max) * h}`).join(' ')

  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} style={{ marginTop: 4 }}>
      <polyline
        points={points}
        fill="none"
        stroke={color}
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      {data.map((v, i) => (
        <circle key={i} cx={i * step} cy={h - (v / max) * h} r="3" fill={color} />
      ))}
    </svg>
  )
}
