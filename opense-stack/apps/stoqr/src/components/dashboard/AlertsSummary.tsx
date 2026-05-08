import { Card } from '@repo/ui'

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
    <Card className="flex flex-col gap-4">
      <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Alerts Summary</h3>
      <div className="grid gap-4 md:grid-cols-2">
        {items.map((item) => (
          <div
            key={item.label}
            className="flex items-center justify-between border-b border-[var(--color-border)] py-2"
          >
            <span className="text-sm text-[var(--color-muted-foreground)]">{item.label}</span>
            <span className="font-semibold text-[var(--color-foreground)]">{item.value}</span>
          </div>
        ))}
      </div>
    </Card>
  )
}
