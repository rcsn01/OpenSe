import { cn } from '../../lib/cn'

interface DividerProps { className?: string; orientation?: 'horizontal' | 'vertical'; label?: string }

export function Divider({ className, orientation = 'horizontal', label }: DividerProps) {
  if (orientation === 'vertical') {
    return <div className={cn('mx-2 inline-block h-full w-px self-stretch bg-[var(--color-border)]', className)} />
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
  return <hr className={cn('my-4 border-t border-[var(--color-border)]', className)} />
}
