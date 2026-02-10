import { cn } from '../../lib/cn'

/* ── Divider / Separator ──────────────────────────────── */

interface DividerProps {
  className?: string
  orientation?: 'horizontal' | 'vertical'
  label?: string
}

export function Divider({ className, orientation = 'horizontal', label }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={cn('mx-2 h-full w-px bg-[var(--color-border)]', className)} />
  }

  if (label) {
    return (
      <div className={cn('flex items-center gap-3', className)}>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
        <span className="text-xs text-[var(--color-muted-foreground)]">{label}</span>
        <div className="h-px flex-1 bg-[var(--color-border)]" />
      </div>
    )
  }

  return <div className={cn('h-px w-full bg-[var(--color-border)]', className)} />
}
