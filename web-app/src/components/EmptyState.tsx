export const EmptyState = ({ title, description }: { title: string; description: string }) => {
  return (
    <div className="empty-state">
      <h3 style={{ marginBottom: 8 }}>{title}</h3>
      <p className="muted" style={{ margin: 0 }}>
        {description}
      </p>
    </div>
  )
}
