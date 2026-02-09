type BadgeVariant = 'success' | 'warning' | 'danger' | 'neutral' | 'info'

export const Badge = ({ label, variant }: { label: string; variant: BadgeVariant }) => {
  return <span className={`badge-pill ${variant}`}>{label}</span>
}
