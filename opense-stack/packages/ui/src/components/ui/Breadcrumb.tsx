import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ChevronRight } from 'lucide-react'

export interface BreadcrumbItem { label: string; href?: string; icon?: ReactNode }

interface BreadcrumbProps { items: BreadcrumbItem[]; className?: string; separator?: ReactNode }

export function Breadcrumb({ items, className, separator }: BreadcrumbProps) {
  const sep = separator ?? <ChevronRight className="mx-2 h-3 w-3 text-[var(--color-muted-foreground)]" />
  return (
    <nav aria-label="Breadcrumb" className={cn('flex items-center text-sm', className)}>
      {items.map((item, i) => {
        const isLast = i === items.length - 1
        return (
          <span key={i} className="inline-flex items-center">
            {i > 0 && sep}
            {item.href && !isLast ? (
              <a href={item.href} className="inline-flex items-center gap-1 text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] transition-colors">
                {item.icon}{item.label}
              </a>
            ) : (
              <span className={cn('inline-flex items-center gap-1', isLast ? 'font-medium text-[var(--color-foreground)]' : 'text-[var(--color-muted-foreground)]')}>
                {item.icon}{item.label}
              </span>
            )}
          </span>
        )
      })}
    </nav>
  )
}
