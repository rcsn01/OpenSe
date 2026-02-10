import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ChevronRight } from 'lucide-react'

/* ── Breadcrumb ───────────────────────────────────────── */

interface BreadcrumbItem {
  label: string
  href?: string
  active?: boolean
}

interface BreadcrumbProps {
  items: BreadcrumbItem[]
  className?: string
  separator?: ReactNode
}

export function Breadcrumb({ items, className, separator }: BreadcrumbProps) {
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center gap-1.5 text-sm', className)}>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1.5">
          {i > 0 && (
            <span className="text-[var(--color-muted-foreground)]">
              {separator ?? <ChevronRight className="h-3.5 w-3.5" />}
            </span>
          )}
          {item.active ? (
            <span className="font-medium text-[var(--color-foreground)]">{item.label}</span>
          ) : (
            <a
              href={item.href ?? '#'}
              className="text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors"
            >
              {item.label}
            </a>
          )}
        </span>
      ))}
    </nav>
  )
}
