import { useState } from 'react'
import { cn } from '../../lib/cn'

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

const BLACK_SHADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const
const WHITE_SHADE_LEVELS = [1, 2, 3, 4, 5, 6, 7, 8, 9] as const

const BLACK_PERCENTS: Record<number, number> = { 1: 0, 2: 5, 3: 10, 4: 15, 5: 20, 6: 25, 7: 30, 8: 35, 9: 40 }
const WHITE_PERCENTS: Record<number, number> = { 1: 0, 2: 2, 3: 4, 4: 6, 5: 8, 6: 10, 7: 12, 8: 14, 9: 16 }

const BLACK_HEX: Record<number, string> = {
  1: '#000000', 2: '#0d0d0d', 3: '#1a1a1a', 4: '#262626', 5: '#333333',
  6: '#404040', 7: '#4d4d4d', 8: '#595959', 9: '#666666',
}
const WHITE_HEX: Record<number, string> = {
  1: '#ffffff', 2: '#fafafa', 3: '#f5f5f5', 4: '#f0f0f0', 5: '#ebebeb',
  6: '#e6e6e6', 7: '#e0e0e0', 8: '#dbdbdb', 9: '#d6d6d6',
}

export function Shades({ className }: { className?: string }) {
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null)

  return (
    <div className={cn('space-y-6', className)}>
      {/* Black row: --shade-black-1 to --shade-black-9 */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
          Black: {BLACK_SHADE_LEVELS.map((n) => `${BLACK_PERCENTS[n]}%`).join(', ')}
        </span>
        <div className="flex pb-2">
          {BLACK_SHADE_LEVELS.map((n, i) => {
            const pct = BLACK_PERCENTS[n]
            const hex = BLACK_HEX[n]
            const swatchKey = `black-${n}`
            const isHovered = hoveredSwatch === swatchKey
            const textColor = getContrastColor(hex)
            const isFirst = i === 0
            const isLast = i === BLACK_SHADE_LEVELS.length - 1
            return (
              <div
                key={swatchKey}
                className={cn(
                  'relative w-12 h-14 flex-shrink-0 transition-all duration-150 cursor-pointer',
                  isFirst && 'rounded-l-sm',
                  isLast && 'rounded-r-sm',
                  isHovered && 'scale-y-110 z-10',
                )}
                style={{ backgroundColor: `var(--shade-black-${n})` }}
                onMouseEnter={() => setHoveredSwatch(swatchKey)}
                onMouseLeave={() => setHoveredSwatch(null)}
                title={`shade-black-${n} · ${pct}% · ${hex.toUpperCase()}`}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-foreground)] px-1.5 py-0.5 text-[10px] text-[var(--color-background)] shadow z-20">
                    shade-black-{n} · {pct}% · {hex.toUpperCase()}
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

      {/* White row: --shade-white-1 to --shade-white-9 */}
      <div className="space-y-2">
        <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
          White: {WHITE_SHADE_LEVELS.map((n) => `${WHITE_PERCENTS[n]}%`).join(', ')}
        </span>
        <div className="flex pb-2 p-3 rounded-md bg-[var(--color-border)]">
          {WHITE_SHADE_LEVELS.map((n, i) => {
            const pct = WHITE_PERCENTS[n]
            const hex = WHITE_HEX[n]
            const swatchKey = `white-${n}`
            const isHovered = hoveredSwatch === swatchKey
            const textColor = getContrastColor(hex)
            const isFirst = i === 0
            const isLast = i === WHITE_SHADE_LEVELS.length - 1
            return (
              <div
                key={swatchKey}
                className={cn(
                  'relative w-12 h-14 flex-shrink-0 transition-all duration-150 cursor-pointer',
                  isFirst && 'rounded-l-sm',
                  isLast && 'rounded-r-sm',
                  isHovered && 'scale-y-110 z-10',
                )}
                style={{ backgroundColor: `var(--shade-white-${n})` }}
                onMouseEnter={() => setHoveredSwatch(swatchKey)}
                onMouseLeave={() => setHoveredSwatch(null)}
                title={`shade-white-${n} · ${pct}% · ${hex.toUpperCase()}`}
              >
                {isHovered && (
                  <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-foreground)] px-1.5 py-0.5 text-[10px] text-[var(--color-background)] shadow z-20">
                    shade-white-{n} · {pct}% · {hex.toUpperCase()}
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
