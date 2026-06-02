export interface EmptyStateProps {
  title: string
  description: string
}

export const EmptyState = ({ title, description }: EmptyStateProps) => {
  return (
    <div className="empty-state">
      <svg className="empty-state-illustration" viewBox="0 0 64 64" aria-hidden>
        <rect x="10" y="14" width="44" height="36" rx="8" fill="currentColor" opacity="0.2" />
        <rect x="16" y="20" width="32" height="6" rx="3" fill="currentColor" opacity="0.4" />
        <rect x="16" y="30" width="24" height="6" rx="3" fill="currentColor" opacity="0.35" />
        <rect x="16" y="40" width="18" height="6" rx="3" fill="currentColor" opacity="0.3" />
      </svg>
      <h3 style={{ marginBottom: 4 }}>{title}</h3>
      <p className="muted" style={{ margin: 0 }}>
        {description}
      </p>
    </div>
  )
}
