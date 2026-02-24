import { useMemo } from 'react'
import { EmptyState } from '../EmptyState'
import { formatCurrency } from '../../utils'

export const InventoryValuationTab = ({
  series,
  filteredTransactions,
}: {
  series: { date: string; value: number }[]
  filteredTransactions: Array<{ quantity_change: number; products: { cost_price: number | null } | null }>
}) => {
  const maxValue = Math.max(...series.map((point) => point.value), 1)

  const chartPath = useMemo(() => {
    if (series.length === 0) return ''
    if (series.length === 1) {
      const y = 100 - (series[0].value / maxValue) * 100
      return `M 0,${y} L 100,${y}`
    }

    return series
      .map((point, index) => {
        const x = (index / (series.length - 1)) * 100
        const y = 100 - (point.value / maxValue) * 100
        return `${index === 0 ? 'M' : 'L'} ${x},${y}`
      })
      .join(' ')
  }, [series, maxValue])

  const periodDelta = filteredTransactions.reduce((acc, transaction) => {
    const cost = transaction.products?.cost_price ?? 0
    return acc + transaction.quantity_change * cost
  }, 0)

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card stat">
          <h3>Current Inventory Value</h3>
          <div className="value">{formatCurrency(series.at(-1)?.value ?? 0)}</div>
        </div>
        <div className="card stat">
          <h3>Range Change</h3>
          <div className="value">{formatCurrency(periodDelta)}</div>
        </div>
      </div>

      <div className="card stack">
        <h3 className="section-title">Inventory Valuation Trend</h3>
        {series.length === 0 ? (
          <EmptyState title="No valuation data" description="Create stock transactions to populate this chart." />
        ) : (
          <div style={{ width: '100%', height: 240, marginTop: 16 }}>
            <svg viewBox="0 0 100 100" preserveAspectRatio="none" style={{ width: '100%', height: '100%' }}>
              <path d={chartPath} fill="none" stroke="var(--primary)" strokeWidth="2" vectorEffect="non-scaling-stroke" />
              <path d={`${chartPath} L 100,100 L 0,100 Z`} fill="var(--primary)" fillOpacity="0.08" stroke="none" />
            </svg>
          </div>
        )}
      </div>
    </div>
  )
}
