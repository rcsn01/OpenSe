import { useState } from 'react'
import { cn } from '../../lib/cn'

function greyFromWhitePercent(pct: number): string {
  const v = Math.round(255 * (pct / 100))
  const hex = v.toString(16).padStart(2, '0')
  return `#${hex}${hex}${hex}`
}

function greyFromBlackPercent(pct: number): string {
  const v = Math.round(255 * ((100 - pct) / 100))
  const hex = v.toString(16).padStart(2, '0')
  return `#${hex}${hex}${hex}`
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

const WHITE_SHADES = [0, 5, 10, 15, 20, 25, 30, 35, 40] as const
const BLACK_SHADES = [0, 3, 6, 9, 12, 15, 18, 21, 24] as const

export function Shades({ className }: { className?: string }) {
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Black row: 5% color gap */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
          Black: {WHITE_SHADES.join('%, ')}%
        </span>
        <div className="flex pb-2">
          {WHITE_SHADES.map((pct, i) => {
            const hex = greyFromWhitePercent(pct)
            const swatchKey = `black-${pct}`
            const isHovered = hoveredSwatch === swatchKey
            const textColor = getContrastColor(hex)
            const isFirst = i === 0
            const isLast = i === WHITE_SHADES.length - 1
            return (
              <div
                key={swatchKey}
                className={cn(
                  'relative w-12 h-14 flex-shrink-0 transition-all duration-150 cursor-pointer',
                  isFirst && 'rounded-l-sm',
                  isLast && 'rounded-r-sm',
                  isHovered && 'scale-y-110 z-10',
                )}
                style={{ backgroundColor: hex }}
                onMouseEnter={() => setHoveredSwatch(swatchKey)}
                onMouseLeave={() => setHoveredSwatch(null)}
                title={`${pct}% black · ${hex.toUpperCase()}`}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-foreground)] px-1.5 py-0.5 text-[10px] text-[var(--color-background)] shadow z-20">
                    {pct}% black · {hex.toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-medium" style={{ color: textColor }}>
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>

      {/* White row: 3% color gap */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
          White: {BLACK_SHADES.join('%, ')}%
        </span>
        <div className="flex pb-2 p-3 rounded-md bg-[var(--color-border)]">
          {BLACK_SHADES.map((pct, i) => {
            const hex = greyFromBlackPercent(pct)
            const swatchKey = `white-${pct}`
            const isHovered = hoveredSwatch === swatchKey
            const textColor = getContrastColor(hex)
            const isFirst = i === 0
            const isLast = i === BLACK_SHADES.length - 1
            return (
              <div
                key={swatchKey}
                className={cn(
                  'relative w-12 h-14 flex-shrink-0 transition-all duration-150 cursor-pointer',
                  isFirst && 'rounded-l-sm',
                  isLast && 'rounded-r-sm',
                  isHovered && 'scale-y-110 z-10',
                )}
                style={{ backgroundColor: hex }}
                onMouseEnter={() => setHoveredSwatch(swatchKey)}
                onMouseLeave={() => setHoveredSwatch(null)}
                title={`${pct}% white · ${hex.toUpperCase()}`}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-foreground)] px-1.5 py-0.5 text-[10px] text-[var(--color-background)] shadow z-20">
                    {pct}% white · {hex.toUpperCase()}
                  </div>
                )}
                <span className="absolute bottom-0.5 left-1/2 -translate-x-1/2 text-[10px] font-medium" style={{ color: textColor }}>
                  {pct}%
                </span>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
