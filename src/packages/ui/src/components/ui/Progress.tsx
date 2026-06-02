import { cn } from '../../lib/cn'

/* ── Progress Bar ─────────────────────────────────────── */

interface ProgressProps {
  value: number; max?: number; className?: string
  variant?: 'default' | 'success' | 'warning' | 'destructive'
  size?: 'sm' | 'md' | 'lg'; showLabel?: boolean
}

const variantColors: Record<string, string> = {
  default: 'bg-[var(--color-primary)]', success: 'bg-[var(--color-success)]',
  warning: 'bg-[var(--color-warning)]', destructive: 'bg-[var(--color-destructive)]',
}

const sizeClasses: Record<string, string> = { sm: 'h-1.5', md: 'h-2.5', lg: 'h-4' }

export function Progress({ value, max = 100, className, variant = 'default', size = 'md', showLabel = false }: ProgressProps) {
  const pct = Math.min(100, Math.max(0, (value / max) * 100))
  return (
    <div className={cn('w-full', className)}>
      {showLabel && (
        <div className="mb-1 flex justify-between text-xs text-[var(--color-muted-foreground)]">
          <span>Progress</span><span>{Math.round(pct)}%</span>
        </div>
      )}
      <div className={cn('w-full overflow-hidden rounded-full bg-[var(--color-muted)]', sizeClasses[size])}>
        <div className={cn('h-full rounded-full transition-all duration-300 ease-in-out', variantColors[variant])} style={{ width: `${pct}%` }} />
      </div>
    </div>
  )
}

/* ── Skeleton ─────────────────────────────────────────── */

interface SkeletonProps { className?: string; width?: string | number; height?: string | number; rounded?: boolean }

export function Skeleton({ className, width, height, rounded = false }: SkeletonProps) {
  return (
    <div
      className={cn('animate-pulse bg-[var(--color-muted)]', rounded ? 'rounded-full' : 'rounded-[var(--radius-md)]', className)}
      style={{ width, height }}
    />
  )
}
