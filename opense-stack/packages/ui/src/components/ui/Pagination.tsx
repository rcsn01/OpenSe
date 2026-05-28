import { cn } from "../../lib/cn";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";

/* ── Full Pagination ──────────────────────────────────── */

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  className?: string;
  siblingCount?: number;
  /* Extended props for ETL compat */
  totalItems?: number;
  itemsPerPage?: number;
  onItemsPerPageChange?: (n: number) => void;
  pageSizeOptions?: number[];
}

function range(start: number, end: number) {
  return Array.from({ length: end - start + 1 }, (_, i) => start + i);
}

function getPages(current: number, total: number, siblings: number) {
  const totalNumbers = siblings * 2 + 5;
  if (totalNumbers >= total) return range(1, total);
  const leftSibling = Math.max(current - siblings, 1);
  const rightSibling = Math.min(current + siblings, total);
  const showLeftDots = leftSibling > 2;
  const showRightDots = rightSibling < total - 2;
  if (!showLeftDots && showRightDots) {
    const leftRange = range(1, 3 + 2 * siblings);
    return [...leftRange, "...", total];
  }
  if (showLeftDots && !showRightDots) {
    const rightRange = range(total - (2 + 2 * siblings), total);
    return [1, "...", ...rightRange];
  }
  return [1, "...", ...range(leftSibling, rightSibling), "...", total];
}

export function Pagination({
  currentPage,
  totalPages,
  onPageChange,
  className,
  siblingCount = 1,
  totalItems,
  itemsPerPage,
  onItemsPerPageChange,
  pageSizeOptions = [10, 25, 50, 100],
}: PaginationProps) {
  const pages = getPages(currentPage, totalPages, siblingCount);
  const hasPageSummary =
    typeof totalItems === "number" && typeof itemsPerPage === "number";
  const hasItems = hasPageSummary && totalItems > 0;
  const startItem = hasItems ? (currentPage - 1) * itemsPerPage + 1 : 0;
  const endItem = hasItems
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : 0;
  const iconButtonCls =
    "inline-flex h-8 w-8 items-center justify-center rounded-[var(--radius-md)] text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)] disabled:pointer-events-none disabled:opacity-35";
  const pageButtonCls =
    "inline-flex h-8 min-w-8 items-center justify-center rounded-[var(--radius-md)] px-2.5 text-sm font-semibold transition-colors";

  return (
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-3",
        className,
      )}
    >
      <div className="flex flex-wrap items-center gap-3 text-sm text-[var(--color-muted-foreground)]">
        {hasPageSummary ? (
          <span>
            showing{" "}
            <span className="font-semibold text-[var(--color-foreground)]">
              {startItem}-{endItem}
            </span>{" "}
            of{" "}
            <span className="font-semibold text-[var(--color-foreground)]">
              {totalItems}
            </span>
          </span>
        ) : null}
      </div>

      <div className="ml-auto flex flex-wrap items-center gap-4">
        <nav
          aria-label="Pagination"
          className="inline-flex items-center gap-1"
        >
          <button
            type="button"
            aria-label="Go to first page"
            onClick={() => onPageChange(1)}
            disabled={currentPage <= 1}
            className={iconButtonCls}
          >
            <ChevronsLeft className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Go to previous page"
            onClick={() => onPageChange(currentPage - 1)}
            disabled={currentPage <= 1}
            className={iconButtonCls}
          >
            <ChevronLeft className="h-4 w-4" />
          </button>

          {pages.map((p, i) =>
            p === "..." ? (
              <span
                key={`dots-${i}`}
                className="inline-flex w-9 items-center justify-center text-[var(--color-muted-foreground)]"
              >
                …
              </span>
            ) : (
              <button
                key={p}
                type="button"
                aria-current={p === currentPage ? "page" : undefined}
                onClick={() => onPageChange(p as number)}
                className={cn(
                  pageButtonCls,
                  p === currentPage
                    ? "bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-[var(--shadow-sm)]"
                    : "text-[var(--color-muted-foreground)] hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]",
                )}
              >
                {p}
              </button>
            ),
          )}

          <button
            type="button"
            aria-label="Go to next page"
            onClick={() => onPageChange(currentPage + 1)}
            disabled={currentPage >= totalPages}
            className={iconButtonCls}
          >
            <ChevronRight className="h-4 w-4" />
          </button>
          <button
            type="button"
            aria-label="Go to last page"
            onClick={() => onPageChange(totalPages)}
            disabled={currentPage >= totalPages}
            className={iconButtonCls}
          >
            <ChevronsRight className="h-4 w-4" />
          </button>
        </nav>

        {typeof itemsPerPage === "number" && onItemsPerPageChange ? (
          <label className="relative flex h-9 cursor-pointer items-center gap-1.5 rounded-[var(--radius-md)] px-2.5 text-sm text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)] hover:text-[var(--color-foreground)]">
            <span aria-hidden="true">Rows</span>
            <span
              aria-hidden="true"
              className="font-semibold text-[var(--color-foreground)]"
            >
              {itemsPerPage}
            </span>
            <select
              aria-label="Items per page"
              value={itemsPerPage}
              onChange={(e) => onItemsPerPageChange(Number(e.target.value))}
              className="absolute inset-0 h-full w-full cursor-pointer appearance-none rounded-[var(--radius-md)] opacity-0"
            >
              {pageSizeOptions.map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </label>
        ) : null}
      </div>
    </div>
  );
}
