import { cn } from '../../lib/cn'
import { ChevronDown, ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from 'lucide-react'

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
  const hasPageSummary = typeof totalItems === 'number' && typeof itemsPerPage === 'number'
  const hasItems = hasPageSummary && totalItems > 0
  const startItem = hasItems ? (currentPage - 1) * itemsPerPage + 1 : 0
  const endItem = hasItems ? Math.min(currentPage * itemsPerPage, totalItems) : 0
  const iconButtonCls = 'inline-flex h-9 w-9 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] transition-colors hover:border-[var(--color-foreground)]/15 hover:bg-[var(--color-muted)] disabled:pointer-events-none disabled:opacity-40'
  const pageButtonCls = 'inline-flex h-9 min-w-9 items-center justify-center rounded-full border px-3 text-sm font-medium transition-colors'

  return (
    <div className={cn('flex flex-wrap items-center justify-between gap-3', className)}>
      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
        {hasPageSummary ? (
          <span>
            showing <span className="font-semibold text-[var(--color-foreground)]">{startItem}-{endItem}</span> of{' '}
            <span className="font-semibold text-[var(--color-foreground)]">{totalItems}</span>
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-3">
        <nav aria-label="Pagination" className="flex items-center gap-2">
          <button type="button" aria-label="Go to first page" onClick={() => onPageChange(1)} disabled={currentPage <= 1} className={iconButtonCls}>
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Go to previous page" onClick={() => onPageChange(currentPage - 1)} disabled={currentPage <= 1} className={iconButtonCls}>
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((p, i) =>
            p === '...' ? (
              <span key={`dots-${i}`} className="inline-flex w-9 items-center justify-center text-[var(--color-muted-foreground)]">…</span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === currentPage ? 'page' : undefined}
                onClick={() => onPageChange(p as number)}
                className={cn(
                  pageButtonCls,
                  p === currentPage
                    ? 'border-[var(--color-foreground)] bg-[var(--color-foreground)] text-[var(--color-background)] shadow-[var(--shadow-sm)]'
                    : 'border-[var(--color-border)] bg-[var(--color-card)] text-[var(--color-foreground)] hover:border-[var(--color-foreground)]/15 hover:bg-[var(--color-muted)]',
                )}
              >
                {p}
              </button>
            ),
          )}

          <button type="button" aria-label="Go to next page" onClick={() => onPageChange(currentPage + 1)} disabled={currentPage >= totalPages} className={iconButtonCls}>
            <ChevronRight className="h-4 w-4" />
          </button>
          <button type="button" aria-label="Go to last page" onClick={() => onPageChange(totalPages)} disabled={currentPage >= totalPages} className={iconButtonCls}>
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>

        {typeof itemsPerPage === 'number' && onItemsPerPageChange ? (
          <label className="relative flex h-9 items-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] px-4 pr-10 text-sm text-[var(--color-foreground)]">
            <select
              aria-label="Items per page"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="appearance-none bg-transparent pr-4 text-sm font-medium text-[var(--color-foreground)] outline-none"
            >
              {pageSizeOptions.map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
            <ChevronDown className="pointer-events-none absolute right-3 h-4 w-4 text-[var(--color-muted-foreground)]" />
          </label>
        ) : null}
      </div>
    </div>
  )
}
