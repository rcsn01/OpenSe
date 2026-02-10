import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/* ── Table ────────────────────────────────────────────── */

interface TableProps {
  children: ReactNode
  className?: string
}

export function Table({ children, className }: TableProps) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)}>{children}</table>
    </div>
  )
}

export function TableHeader({ children, className }: TableProps) {
  return <thead className={cn('border-b border-[var(--color-border)]', className)}>{children}</thead>
}

export function TableBody({ children, className }: TableProps) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)}>{children}</tbody>
}

export function TableRow({ children, className }: TableProps) {
  return (
    <tr
      className={cn(
        'border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-muted)]/50',
        className,
      )}
    >
      {children}
    </tr>
  )
}

interface TableCellProps {
  children: ReactNode
  className?: string
  header?: boolean
}

export function TableCell({ children, className, header = false }: TableCellProps) {
  const Tag = header ? 'th' : 'td'
  return (
    <Tag
      className={cn(
        'px-4 py-3 text-left align-middle',
        header && 'font-medium text-[var(--color-muted-foreground)]',
        className,
      )}
    >
      {children}
    </Tag>
  )
}
