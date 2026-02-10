// Uses @repo/ui StatusBadge, re-exported as Badge with StoQR's variant API
import { StatusBadge } from '@repo/ui'

type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export const Badge = ({ label, variant }: { label: string; variant: BadgeVariant }) => {
  return <StatusBadge label={label} tone={variant} />
}
