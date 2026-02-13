import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/* ── StackLayout ──────────────────────────────────────── */

interface StackLayoutProps {
  children: ReactNode
  className?: string
  /** 'stack' = flex column, 'grid' = grid with 2 cols on md, 'grid-2' = auto-fit minmax(280px), 'stats' = auto-fit grid for stat cards */
  variant?: 'stack' | 'grid' | 'grid-2' | 'stats'
}

export function StackLayout({ children, className, variant = 'stack' }: StackLayoutProps) {
  return (
    <div
      className={cn(
        'gap-[var(--gap-4)]',
        variant === 'stack' && 'flex flex-col',
        variant === 'grid' && 'grid md:grid-cols-2',
        variant === 'grid-2' && 'grid',
        variant === 'stats' && 'grid',
        className,
      )}
      style={
        variant === 'stats'
          ? { gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))' }
          : variant === 'grid-2'
            ? { gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))' }
            : undefined
      }
    >
      {children}
    </div>
  )
}
