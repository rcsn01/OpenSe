import { useState } from 'react'
import { cn } from '../../lib/cn'

/* ── Color helpers (HSL) ──────────────────────────────── */

function hexToHsl(hex: string): [number, number, number] {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255
  const max = Math.max(r, g, b), min = Math.min(r, g, b)
  let h = 0, s = 0
  const l = (max + min) / 2
  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = ((g - b) / d + (g < b ? 6 : 0)) / 6; break
      case g: h = ((b - r) / d + 2) / 6; break
      case b: h = ((r - g) / d + 4) / 6; break
    }
  }
  return [Math.round(h * 360), Math.round(s * 100), Math.round(l * 100)]
}

function hslToHex(h: number, s: number, l: number): string {
  const sn = s / 100, ln = l / 100
  const a = sn * Math.min(ln, 1 - ln)
  const f = (n: number) => {
    const k = (n + h / 30) % 12
    const color = ln - a * Math.max(Math.min(k - 3, 9 - k, 1), -1)
    return Math.round(255 * color).toString(16).padStart(2, '0')
  }
  return `#${f(0)}${f(8)}${f(4)}`
}

function getContrastColor(hex: string): string {
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255
  return luminance > 0.5 ? '#000000' : '#ffffff'
}

/* ── Types ────────────────────────────────────────────── */

interface PrimaryColor {
  name: string
  hex: string
}

interface ColorPaletteProps {
  colors?: PrimaryColor[]
  steps?: number
  className?: string
}

/* ── Component ────────────────────────────────────────── */

const TOTAL_STEPS = 10
const BASE_STEP = 5 // base color is in the middle (step 5 of 10)

export function ColorPalette({
  colors = [
    { name: 'Primary1', hex: '#ccd5ae' },
    { name: 'Primary2', hex: '#d4a373' },
  ],
  steps = TOTAL_STEPS,
  className,
}: ColorPaletteProps) {
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null)

  return (
    <div className={cn('space-y-12', className)}>
      {colors.map((color) => {
        const [baseH, baseS, baseL] = hexToHsl(color.hex)

        // Generate 10 steps: 1=brightest, 5=base, 10=darkest
        // Linear interpolation: L=100 at step 1, L=baseL at step 5, L=0 at step 10
        const swatches: { step: number; hex: string; l: number }[] = []
        for (let i = 1; i <= steps; i++) {
          let l: number
          if (i <= BASE_STEP) {
            // Steps 1–5: 100 → baseL
            l = 100 - ((100 - baseL) * (i - 1)) / (BASE_STEP - 1)
          } else {
            // Steps 5–10: baseL → 0
            l = baseL - (baseL * (i - BASE_STEP)) / (steps - BASE_STEP)
          }
          l = Math.max(0, Math.min(100, Math.round(l)))
          swatches.push({ step: i, hex: hslToHex(baseH, baseS, l), l })
        }

        return (
          <div key={color.hex} className="space-y-6">
            {/* Color header */}
            <div className="flex items-center gap-4">
              <div className="h-10 w-10 rounded-[var(--radius-lg)] shadow-[var(--shadow-md)]" style={{ backgroundColor: color.hex }} />
              <div>
                <h3 className="text-lg font-semibold text-[var(--color-foreground)]">{color.name}</h3>
                <p className="text-sm text-[var(--color-muted-foreground)]">
                  {color.hex.toUpperCase()} · HSL({baseH}, {baseS}%, {baseL}%)
                </p>
              </div>
            </div>

            {/* 10-step scale: 1=brightest, 5=base, 10=darkest */}
            <div className="space-y-2">
              <div className="flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                  1 (brightest) → 10 (darkest) · Base at {BASE_STEP}
                </span>
              </div>
              <div className="flex overflow-x-auto pb-2 gap-0.5">
                {swatches.map((swatch) => {
                  const swatchKey = `${color.hex}-${swatch.step}`
                  const isHovered = hoveredSwatch === swatchKey
                  const isBase = swatch.step === BASE_STEP
                  const textColor = getContrastColor(swatch.hex)
                  return (
                    <div
                      key={swatchKey}
                      className={cn(
                        'relative flex-shrink-0 transition-all duration-150 cursor-pointer',
                        isBase ? 'w-10 h-14 z-10 ring-2 ring-[var(--color-foreground)]/30 rounded-sm' : 'w-4 h-12',
                        isHovered && 'scale-y-110 z-20',
                      )}
                      style={{ backgroundColor: swatch.hex }}
                      onMouseEnter={() => setHoveredSwatch(swatchKey)}
                      onMouseLeave={() => setHoveredSwatch(null)}
                      title={`${swatch.step}: ${swatch.hex.toUpperCase()} · L: ${swatch.l}%`}
                    >
                      {isHovered && (
                        <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-foreground)] px-1.5 py-0.5 text-[10px] text-[var(--color-background)] shadow z-30">
                          {swatch.step}: {swatch.hex.toUpperCase()}
                        </div>
                      )}
                      {isBase && (
                        <span className="absolute inset-0 flex items-center justify-center text-[8px] font-bold" style={{ color: textColor }}>
                          BASE
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}
