import { useEffect, useMemo, useState } from 'react'
import { DataTable } from '@repo/ui'
import {
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
} from 'recharts'
import { useAuditShrinkageData } from '../../hooks/queries/useReports'

const REASON_COLORS: Record<string, string> = {
  'Damaged in Transit': '#3b82f6',
  Expired: '#f59e0b',
  'Lost/Theft': '#ef4444',
  'Counting Error': '#64748b',
}

const reasonOptions = ['all', 'Damaged in Transit', 'Expired', 'Lost/Theft', 'Counting Error'] as const

const inferReasonCode = (input: { transaction_type: string; source: string | null; notes: string | null }) => {
  const note = (input.notes ?? '').toLowerCase()

  if (note.includes('damage') || note.includes('damaged') || note.includes('transit') || note.includes('broken')) {
    return 'Damaged in Transit'
  }
  if (note.includes('expir')) {
    return 'Expired'
  }
  if (
    input.transaction_type === 'loss'
    || note.includes('theft')
    || note.includes('stolen')
    || note.includes('missing')
    || note.includes('shrink')
    || note.includes('loss')
  ) {
    return 'Lost/Theft'
  }
  if (input.source === 'receiving') {
    return 'Damaged in Transit'
  }
  return 'Counting Error'
}

const formatCompactCurrency = (value: number) => {
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`
  if (value >= 1_000) return `$${(value / 1_000).toFixed(1)}K`
  return `$${value.toFixed(0)}`
}

const formatAuditDate = (value: string) =>
  new Date(value).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  })

export const AuditsShrinkageTab = ({ companyId }: { companyId: string | null }) => {
  const { data } = useAuditShrinkageData(companyId)
  const [isMounted, setIsMounted] = useState(false)
  const [reasonFilter, setReasonFilter] = useState<(typeof reasonOptions)[number]>('all')

  useEffect(() => {
    setIsMounted(true)
  }, [])

  const discrepancies = data?.discrepancies ?? []
  const sales = data?.sales ?? []

  const shrinkageEvents = useMemo(
    () => discrepancies.filter((item) => item.quantity_change < 0),
    [discrepancies],
  )

  const totalShrinkageValue = useMemo(
    () => shrinkageEvents.reduce((sum, item) => sum + Math.abs(item.quantity_change) * (item.products?.cost_price ?? 0), 0),
    [shrinkageEvents],
  )

  const ytdRevenue = useMemo(
    () => sales.reduce((sum, item) => sum + Math.abs(item.quantity_change) * (item.products?.selling_price ?? 0), 0),
    [sales],
  )

  const shrinkageRate = ytdRevenue > 0 ? (totalShrinkageValue / ytdRevenue) * 100 : 0

  const recentDiscrepancies = useMemo(() => {
    const cutoff = Date.now() - 30 * 24 * 60 * 60 * 1000
    return discrepancies.filter((item) => new Date(item.created_at).getTime() >= cutoff)
  }, [discrepancies])

  const inventoryAccuracy = useMemo(() => {
    if (recentDiscrepancies.length === 0) return 100

    const totalAccuracy = recentDiscrepancies.reduce((sum, item) => {
      const expected = Math.max(Math.abs(item.stock_after - item.quantity_change), 1)
      const variance = Math.abs(item.quantity_change)
      const accuracy = Math.max(0, 1 - variance / expected)
      return sum + accuracy
    }, 0)

    return (totalAccuracy / recentDiscrepancies.length) * 100
  }, [recentDiscrepancies])

  const pendingDiscrepancies = recentDiscrepancies.length

  const reasonBreakdown = useMemo(() => {
    const totals = new Map<string, number>()

    discrepancies.forEach((item) => {
      const reason = inferReasonCode(item)
      totals.set(reason, (totals.get(reason) ?? 0) + Math.abs(item.quantity_change))
    })

    return Array.from(totals.entries()).map(([name, value]) => ({
      name,
      value,
    }))
  }, [discrepancies])

  const logRows = useMemo(() => {
    const rows = discrepancies.map((item) => {
      const expected = item.stock_after - item.quantity_change
      return {
        id: item.id,
        date: item.created_at,
        sku: item.products?.sku ?? 'N/A',
        expected,
        actual: item.stock_after,
        variance: item.quantity_change,
        reason: inferReasonCode(item),
      }
    })

    return rows
      .filter((row) => reasonFilter === 'all' || row.reason === reasonFilter)
      .slice(0, 6)
  }, [discrepancies, reasonFilter])

  return (
    <div className="stack">
      <div className="grid grid-3">
        <div className="card stat">
          <h3>Total Shrinkage Value (YTD)</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="value" style={{ color: '#e11d48' }}>{formatCompactCurrency(totalShrinkageValue)}</div>
            <span className="small muted">{shrinkageRate.toFixed(1)}% of revenue</span>
          </div>
          <div
            style={{
              marginTop: 10,
              height: 30,
              borderTop: '3px solid #ef4444',
              background: 'linear-gradient(180deg, rgba(148, 163, 184, 0.16), rgba(100, 116, 139, 0.9))',
              borderRadius: '0 0 var(--radius-sm) var(--radius-sm)',
            }}
          />
        </div>

        <div className="card stat">
          <h3>Inventory Accuracy</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="value" style={{ color: '#10b981' }}>{inventoryAccuracy.toFixed(1)}%</div>
            <span className="small muted">Rolling 30-day average</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginTop: 10 }}>
            <div style={{ height: 3, flex: 1, background: '#10b981', borderRadius: 'var(--radius-full)' }} />
            {[0, 1, 2, 3].map((index) => (
              <div
                key={index}
                style={{
                  width: 8,
                  height: 8,
                  borderRadius: '50%',
                  background: '#10b981',
                  margin: '0 12px',
                }}
              />
            ))}
            <div style={{ height: 3, flex: 1, background: '#10b981', borderRadius: 'var(--radius-full)' }} />
          </div>
        </div>

        <div className="card stat">
          <h3>Pending Discrepancies</h3>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: 8 }}>
            <div className="value" style={{ color: '#d97706' }}>{pendingDiscrepancies}</div>
            <span className="small muted">Requires manager review</span>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 8 }}>
            {Array.from({ length: 5 }).map((_, index) => (
              <div
                key={index}
                style={{
                  width: 32,
                  height: Math.max(24, 40 - index * 3),
                  borderRadius: 'var(--radius-sm)',
                  background: index < Math.min(pendingDiscrepancies, 5) ? '#f59e0b' : 'var(--color-muted)',
                }}
              />
            ))}
          </div>
        </div>
      </div>

      <div className="audit-layout">
        <div className="card stack">
          <h3 className="section-title">Shrinkage Reason Codes</h3>
          {reasonBreakdown.length === 0 ? (
            <div className="empty-state">No discrepancy data available.</div>
          ) : (
            <>
              <div style={{ height: 220, width: '100%' }}>
                {isMounted ? (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={reasonBreakdown}
                        cx="50%"
                        cy="50%"
                        innerRadius={62}
                        outerRadius={90}
                        dataKey="value"
                        nameKey="name"
                        strokeWidth={4}
                        stroke="var(--color-card)"
                      >
                        {reasonBreakdown.map((entry) => (
                          <Cell key={entry.name} fill={REASON_COLORS[entry.name] ?? 'var(--color-muted-foreground)'} />
                        ))}
                      </Pie>
                      <Tooltip formatter={(value) => [value, 'Variance Units']} />
                    </PieChart>
                  </ResponsiveContainer>
                ) : null}
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, fontSize: 'var(--type-size-sm)' }}>
                {reasonBreakdown.map((entry) => (
                  <span key={entry.name} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, color: REASON_COLORS[entry.name] ?? 'var(--color-foreground)' }}>
                    <span
                      style={{
                        width: 10,
                        height: 10,
                        borderRadius: '50%',
                        background: REASON_COLORS[entry.name] ?? 'var(--color-muted-foreground)',
                        display: 'inline-block',
                      }}
                    />
                    {entry.name}
                  </span>
                ))}
              </div>
            </>
          )}
        </div>

        <div className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
          <div style={{ padding: '20px 24px 0' }} className="flex-between">
            <h3 className="section-title" style={{ marginBottom: 0 }}>Recent Discrepancy Log</h3>
            <label className="row small muted" style={{ gap: 8 }}>
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3" />
              </svg>
              <span>Filter</span>
              <select className="input" value={reasonFilter} onChange={(event) => setReasonFilter(event.target.value as (typeof reasonOptions)[number])}>
                <option value="all">All Reasons</option>
                <option value="Damaged in Transit">Damaged in Transit</option>
                <option value="Expired">Expired</option>
                <option value="Lost/Theft">Lost/Theft</option>
                <option value="Counting Error">Counting Error</option>
              </select>
            </label>
          </div>

          {logRows.length === 0 ? (
            <div className="empty-state" style={{ padding: 32 }}>No discrepancy records for the selected filter.</div>
          ) : (
            <DataTable
              columns={[
                {
                  id: 'date',
                  header: 'Date',
                  renderCell: (row: (typeof logRows)[number]) => <span className="small muted">{formatAuditDate(row.date)}</span>,
                },
                {
                  id: 'sku',
                  header: 'SKU',
                  renderCell: (row: (typeof logRows)[number]) => (
                    <span style={{ fontWeight: 'var(--type-weight-semibold)' }}>{row.sku}</span>
                  ),
                },
                {
                  id: 'expected',
                  header: 'Expected',
                  align: 'right',
                  renderCell: (row: (typeof logRows)[number]) => row.expected,
                },
                {
                  id: 'actual',
                  header: 'Actual',
                  align: 'right',
                  renderCell: (row: (typeof logRows)[number]) => row.actual,
                },
                {
                  id: 'variance',
                  header: 'Variance',
                  align: 'right',
                  renderCell: (row: (typeof logRows)[number]) => (
                    <span
                      style={{
                        fontWeight: 'var(--type-weight-semibold)',
                        color: row.variance < 0 ? '#e11d48' : '#059669',
                      }}
                    >
                      {row.variance > 0 ? '+' : ''}{row.variance}
                    </span>
                  ),
                },
                {
                  id: 'reason',
                  header: 'Reason',
                  renderCell: (row: (typeof logRows)[number]) => (
                    <span className="pill" style={{ color: 'var(--color-muted-foreground)' }}>{row.reason}</span>
                  ),
                },
              ]}
              rows={logRows}
              getRowId={(row) => row.id}
              tableWrapClassName="border-0 rounded-none"
            />
          )}
        </div>
      </div>
    </div>
  )
}
