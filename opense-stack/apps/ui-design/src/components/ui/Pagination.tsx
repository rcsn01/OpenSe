import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { ChevronLeft, ChevronRight } from 'lucide-react'

/* ── Pagination ───────────────────────────────────────── */

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ currentPage, totalPages, onPageChange, className }: PaginationProps) {
  const pages = getPageNumbers(currentPage, totalPages)

  return (
    <nav aria-label="Pagination" className={cn('flex items-center gap-1', className)}>
      <button
        onClick={() => onPageChange(currentPage - 1)}
        disabled={currentPage <= 1}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-sm hover:bg-[var(--color-muted)] disabled:opacity-50 disabled:pointer-events-none"
      >
        <ChevronLeft className="h-4 w-4" />
      </button>

      {pages.map((page, i) =>
        page === '...' ? (
          <span key={`ellipsis-${i}`} className="flex h-8 w-8 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
            …
          </span>
        ) : (
          <button
            key={page}
            onClick={() => onPageChange(page as number)}
            className={cn(
              'inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-sm transition-colors',
              currentPage === page
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)]'
                : 'hover:bg-[var(--color-muted)]',
            )}
          >
            {page}
          </button>
        ),
      )}

      <button
        onClick={() => onPageChange(currentPage + 1)}
        disabled={currentPage >= totalPages}
        className="inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-sm hover:bg-[var(--color-muted)] disabled:opacity-50 disabled:pointer-events-none"
      >
        <ChevronRight className="h-4 w-4" />
      </button>
    </nav>
  )
}

function getPageNumbers(current: number, total: number): (number | '...')[] {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1)
  if (current <= 3) return [1, 2, 3, 4, '...', total]
  if (current >= total - 2) return [1, '...', total - 3, total - 2, total - 1, total]
  return [1, '...', current - 1, current, current + 1, '...', total]
}
