export const ProgressBar = ({ 
  value, 
  max, 
  color = 'var(--primary)', 
  label 
}: { 
  value: number
  max: number
  color?: string
  label?: string 
}) => {
  const percent = max > 0 ? Math.min(100, Math.max(0, (value / max) * 100)) : 0
  return (
    <div style={{ marginBottom: 8 }}>
      <div className="flex-between small" style={{ marginBottom: 4 }}>
        <span>{label}</span>
        <span className="muted">{value} / {max}</span>
      </div>
      <div style={{ height: 6, width: '100%', background: '#f1f5f9', borderRadius: 3, overflow: 'hidden' }}>
        <div style={{ height: '100%', width: `${percent}%`, background: color, borderRadius: 3 }} />
      </div>
    </div>
  )
}