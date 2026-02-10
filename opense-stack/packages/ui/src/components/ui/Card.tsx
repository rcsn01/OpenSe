import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/* ── Card ─────────────────────────────────────────────── */

interface CardProps { children: ReactNode; className?: string; padding?: 'none' | 'sm' | 'md' | 'lg'; hoverable?: boolean }

const paddingMap = { none: '', sm: 'p-3', md: 'p-4', lg: 'p-6' }

export function Card({ children, className, padding = 'md', hoverable = false }: CardProps) {
  return (
    <div className={cn(
      'rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-card-foreground)] shadow-[var(--shadow-sm)]',
      paddingMap[padding],
      hoverable && 'transition-shadow duration-[var(--transition-normal)] hover:shadow-[var(--shadow-md)]',
      className,
    )}>{children}</div>
  )
}

interface SectionProps { children: ReactNode; className?: string }

export function CardHeader({ children, className }: SectionProps) {
  return <div className={cn('flex flex-col gap-1.5 pb-3', className)}>{children}</div>
}

export function CardTitle({ children, className }: SectionProps) {
  return <h3 className={cn('text-lg font-semibold leading-none tracking-tight', className)}>{children}</h3>
}

export function CardDescription({ children, className }: SectionProps) {
  return <p className={cn('text-sm text-[var(--color-muted-foreground)]', className)}>{children}</p>
}

export function CardContent({ children, className }: SectionProps) {
  return <div className={cn('', className)}>{children}</div>
}

export function CardFooter({ children, className }: SectionProps) {
  return <div className={cn('flex items-center gap-2 pt-3', className)}>{children}</div>
}
