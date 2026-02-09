import { useMemo } from 'react'

type PaginationProps = {
  page: number
  pageSize: number
  totalItems: number
  onPageChange: (page: number) => void
}

export const Pagination = ({ page, pageSize, totalItems, onPageChange }: PaginationProps) => {
  const totalPages = Math.ceil(totalItems / pageSize)
  const startItem = (page - 1) * pageSize + 1
  const endItem = Math.min(page * pageSize, totalItems)

  const pages = useMemo(() => {
    // Simple logic to show a window of pages
    const p = []
    for (let i = 1; i <= totalPages; i++) {
      if (i === 1 || i === totalPages || (i >= page - 1 && i <= page + 1)) {
        p.push(i)
      } else if (i === page - 2 || i === page + 2) {
        p.push('...')
      }
    }
    // Deduplicate and filter
    return [...new Set(p)].filter((x, i, a) => x !== '...' || a[i - 1] !== '...')
  }, [page, totalPages])

  if (totalItems === 0) return null

  return (
    <div className="flex-between" style={{ paddingTop: 16, borderTop: '1px solid var(--border)' }}>
      <div className="small muted">
        Showing <strong>{startItem}</strong> to <strong>{endItem}</strong> of <strong>{totalItems}</strong> results
      </div>
      <div className="row" style={{ gap: 4 }}>
        <button
          className="button ghost small"
          disabled={page === 1}
          onClick={() => onPageChange(page - 1)}
          style={{ padding: '6px 12px' }}
        >
          Previous
        </button>

        {pages.map((p, i) => (
          <button
            key={i}
            className={`button small ${p === page ? '' : 'ghost'}`}
            disabled={p === '...'}
            onClick={() => (typeof p === 'number' ? onPageChange(p) : null)}
            style={{ 
              minWidth: 32, 
              padding: '6px', 
              cursor: p === '...' ? 'default' : 'pointer' 
            }}
          >
            {p}
          </button>
        ))}

        <button
          className="button ghost small"
          disabled={page === totalPages}
          onClick={() => onPageChange(page + 1)}
          style={{ padding: '6px 12px' }}
        >
          Next
        </button>
      </div>
    </div>
  )
}