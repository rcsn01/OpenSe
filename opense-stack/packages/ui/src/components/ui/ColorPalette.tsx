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

interface PaletteRowConfig {
  label: string
  saturationMultiplier: number   // 1 = normal, 0 = grey, 0.5 = muted
  lightnessOffset: number        // additional offset: e.g. +10 for lighter, -10 for darker
}

interface ColorPaletteProps {
  colors?: PrimaryColor[]
  step?: number
  className?: string
}

/* ── Component ────────────────────────────────────────── */

export function ColorPalette({
  colors = [
    { name: 'Primary Blue', hex: '#2563eb' },
    { name: 'Primary Violet', hex: '#7c3aed' },
  ],
  step = 2,
  className,
}: ColorPaletteProps) {
  const [hoveredSwatch, setHoveredSwatch] = useState<string | null>(null)

  // Row configurations: original, grey-lighter x2, darker x2
  const rowConfigs: PaletteRowConfig[] = [
    { label: 'Original', saturationMultiplier: 1, lightnessOffset: 0 },
    { label: 'Grey (Light 1)', saturationMultiplier: 0.15, lightnessOffset: 8 },
    { label: 'Grey (Light 2)', saturationMultiplier: 0.08, lightnessOffset: 14 },
    { label: 'Dark 1', saturationMultiplier: 0.75, lightnessOffset: -8 },
    { label: 'Dark 2', saturationMultiplier: 0.55, lightnessOffset: -16 },
  ]

  return (
    <div className={cn('space-y-12', className)}>
      {colors.map((color) => {
        const [baseH, baseS, baseL] = hexToHsl(color.hex)

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

            {/* Rows */}
            {rowConfigs.map((rowConfig) => {
              const rowS = Math.max(0, Math.min(100, Math.round(baseS * rowConfig.saturationMultiplier)))
              const rowBaseL = Math.max(0, Math.min(100, baseL + rowConfig.lightnessOffset))

              // Generate lighter steps (toward white: increase L by step% each time)
              const lighterSteps: { hex: string; l: number }[] = []
              for (let l = rowBaseL; l <= 100; l += step) {
                const clamped = Math.min(100, l)
                lighterSteps.push({ hex: hslToHex(baseH, rowS, clamped), l: clamped })
              }
              if (lighterSteps[lighterSteps.length - 1]?.l !== 100) {
                lighterSteps.push({ hex: hslToHex(baseH, rowS, 100), l: 100 })
              }

              // Generate darker steps (toward black: decrease L by step% each time)
              const darkerSteps: { hex: string; l: number }[] = []
              for (let l = rowBaseL - step; l >= 0; l -= step) {
                const clamped = Math.max(0, l)
                darkerSteps.push({ hex: hslToHex(baseH, rowS, clamped), l: clamped })
              }
              if (darkerSteps.length === 0 || darkerSteps[darkerSteps.length - 1]?.l !== 0) {
                darkerSteps.push({ hex: hslToHex(baseH, rowS, 0), l: 0 })
              }

              // Combine: darker (reversed) → base → lighter
              const allSteps = [...darkerSteps.reverse(), ...lighterSteps]

              return (
                <div key={rowConfig.label} className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-medium text-[var(--color-muted-foreground)] uppercase tracking-wider">
                      {rowConfig.label}
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      S: {rowS}% · Base L: {rowBaseL}%
                    </span>
                  </div>
                  <div className="flex overflow-x-auto pb-2">
                    {allSteps.map((swatch, i) => {
                      const swatchKey = `${color.hex}-${rowConfig.label}-${i}`
                      const isHovered = hoveredSwatch === swatchKey
                      const isBase = swatch.l === rowBaseL
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
                          title={`${swatch.hex.toUpperCase()} · L: ${swatch.l}%`}
                        >
                          {isHovered && (
                            <div className="absolute -top-8 left-1/2 -translate-x-1/2 whitespace-nowrap rounded bg-[var(--color-foreground)] px-1.5 py-0.5 text-[10px] text-[var(--color-background)] shadow z-30">
                              {swatch.hex.toUpperCase()}
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
              )
            })}
          </div>
        )
      })}
    </div>
  )
}
