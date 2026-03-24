export const AlertsSummary = ({
  summary,
}: {
  summary: {
    openAlerts: number
    criticalAlerts: number
    lowStockAlerts: number
    reorderAlerts: number
    expirationAlerts: number
  }
}) => {
  const items = [
    { label: 'Open Alerts', value: summary.openAlerts },
    { label: 'Critical', value: summary.criticalAlerts },
    { label: 'Low Stock', value: summary.lowStockAlerts },
    { label: 'Reorder', value: summary.reorderAlerts },
    { label: 'Expiration', value: summary.expirationAlerts },
  ]

  return (
    <div className="card stack">
      <h3 className="section-title">Alerts Summary</h3>
      <div className="grid grid-2">
        {items.map((item) => (
          <div key={item.label} className="flex-between" style={{ padding: '8px 0', borderBottom: '1px solid var(--border)' }}>
            <span className="small muted">{item.label}</span>
            <span style={{ fontWeight: 'var(--type-weight-bold)' }}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
