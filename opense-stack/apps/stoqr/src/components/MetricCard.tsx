export const MetricCard = ({ 
  title, 
  value, 
  subtext 
}: { 
  title: string
  value: string | number
  subtext: string 
}) => (
  <div className="card stat">
    <h3>{title}</h3>
    <div className="value">{value}</div>
    <div className="muted small">{subtext}</div>
  </div>
)