export const SimpleLineChart = ({ 
  data, 
  color = '#2563eb' 
}: { 
  data: { value: number }[]
  color?: string 
}) => {
  if (!data.length) return null
  const max = Math.max(...data.map((d) => d.value)) * 1.1
  const min = Math.min(...data.map((d) => d.value)) * 0.9
  const range = max - min || 1

  const points = data
    .map((d, i) => {
      const x = (i / (data.length - 1)) * 100
      const y = 100 - ((d.value - min) / range) * 100
      return `${x},${y}`
    })
    .join(' ')

  return (
    <div style={{ height: '100px', width: '100%', marginTop: '16px' }}>
      <svg 
        viewBox="0 0 100 100" 
        preserveAspectRatio="none" 
        style={{ width: '100%', height: '100%', overflow: 'visible' }}
      >
        <path 
          d={`M ${points}`} 
          fill="none" 
          stroke={color} 
          strokeWidth="2" 
          vectorEffect="non-scaling-stroke" 
        />
        <path 
          d={`M 0,100 L ${points} L 100,100 Z`} 
          fill={color} 
          fillOpacity="0.1" 
          stroke="none" 
        />
      </svg>
    </div>
  )
}