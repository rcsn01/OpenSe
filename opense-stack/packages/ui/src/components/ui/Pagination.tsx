import { cn } from '../../lib/cn'
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

/* ── Full Pagination ──────────────────────────────────── */

interface PaginationProps {
  currentPage: number
  totalPages: number
  onPageChange: (page: number) => void
  className?: string
  siblingCount?: number
  /* Extended props for ETL compat */
  totalItems?: number
  itemsPerPage?: number
  onItemsPerPageChange?: (n: number) => void
  pageSizeOptions?: number[]
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i)
}

function getPages(current: number, total: number, siblings: number) {
  const totalNumbers = siblings * 2 + 5
  if (totalNumbers >= total) return range(1, total)
  const leftSibling = Math.max(current - siblings, 1)
  const rightSibling = Math.min(current + siblings, total)
  const showLeftDots = leftSibling > 2
  const showRightDots = rightSibling < total - 2
  if (!showLeftDots && showRightDots) {
    const leftRange = range(1, 3 + 2 * siblings)
    return [...leftRange, '...', total]
  }
  if (showLeftDots && !showRightDots) {
    const rightRange = range(total - (2 + 2 * siblings), total)
    return [1, '...', ...rightRange]
  }
  return [1, '...', ...range(leftSibling, rightSibling), '...', total]
}

export function Pagination({
  currentPage, totalPages, onPageChange, className, siblingCount = 1,
  totalItems, itemsPerPage, onItemsPerPageChange, pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const pages = getPages(currentPage, totalPages, siblingCount)
  const btnCls = 'inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-sm transition-colors'

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-4', className)}>
      {/* Page size selector (ETL compat) */}
      {typeof itemsPerPage === 'number' && onItemsPerPageChange && (
        <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
          <span>Show</span>
          <select
            value={itemsPerPage}
            onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
            className="rounded-[var(--radius-md)] border border-[var(--color-border)] bg-[var(--color-card)] px-2 py-1 text-sm"
          >
            {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
          </select>
          {typeof totalItems === 'number' && <span>of {totalItems}</span>}
        </div>
      )}

      {/* Page buttons */}
      <nav className="flex items-center gap-1">
        <button onClick={() => onPageChange(1)} disabled={currentPage <= 1} className={cn(btnCls, 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30')}>
          <ChevronsLeft className="h-4 w-4" />
        </button>
        <button onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className={cn(btnCls, 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30')}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        {pages.map((p, i) =>
          p === '...' ? (
            <span key={`dots-${i}`} className="px-1 text-[var(--color-muted-foreground)]">…</span>
          ) : (
            <button key={p} onClick={() => onPageChange(p as number)}
              className={cn(btnCls, p === currentPage
                ? 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)]'
                : 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)]',
              )}
            >{p}</button>
          ),
        )}

        <button onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={cn(btnCls, 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30')}>
          <ChevronRight className="h-4 w-4" />
        </button>
        <button onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages} className={cn(btnCls, 'text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] disabled:opacity-30')}>
          <ChevronsRight className="h-4 w-4" />
        </button>
      </nav>
    </div>
  )
}
