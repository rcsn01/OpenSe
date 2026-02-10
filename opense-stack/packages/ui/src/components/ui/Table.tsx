import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/* ── Full-featured Table components ──────────────────── */

export function Table({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className="w-full overflow-auto">
      <table className={cn('w-full caption-bottom text-sm', className)}>{children}</table>
    </div>
  )
}

export function TableHeader({ children, className }: { children: ReactNode; className?: string }) {
  return <thead className={cn('[&_tr]:border-b', className)}>{children}</thead>
}

export function TableBody({ children, className }: { children: ReactNode; className?: string }) {
  return <tbody className={cn('[&_tr:last-child]:border-0', className)}>{children}</tbody>
}

export function TableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn('border-b border-[var(--color-border)] transition-colors hover:bg-[var(--color-muted)]/50', className)}>{children}</tr>
}

export function TableHead({ children, className }: { children: ReactNode; className?: string }) {
  return <th className={cn('h-10 px-4 text-left align-middle font-medium text-[var(--color-muted-foreground)] [&:has([role=checkbox])]:pr-0', className)}>{children}</th>
}

export function TableCell({ children, className }: { children: ReactNode; className?: string }) {
  return <td className={cn('p-4 align-middle [&:has([role=checkbox])]:pr-0', className)}>{children}</td>
}

export function TableCaption({ children, className }: { children: ReactNode; className?: string }) {
  return <caption className={cn('mt-4 text-sm text-[var(--color-muted-foreground)]', className)}>{children}</caption>
}

/* ── TableContainer (ETL compat: simple styled wrapper) ─ */

export function TableContainer({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div className={cn(
      'w-full overflow-auto rounded-[var(--radius-lg)] border border-[var(--color-border)] bg-[var(--color-card)]',
      '[&_table]:w-full [&_table]:border-collapse [&_table]:text-sm',
      '[&_th]:bg-[var(--color-muted)]/50 [&_th]:px-4 [&_th]:py-3 [&_th]:text-left [&_th]:font-semibold [&_th]:text-[var(--color-foreground)]',
      '[&_td]:px-4 [&_td]:py-3 [&_td]:text-[var(--color-muted-foreground)]',
      '[&_tbody_tr]:border-t [&_tbody_tr]:border-[var(--color-border)] [&_tbody_tr:hover]:bg-[var(--color-muted)]/50',
      className,
    )}>
      {children}
    </div>
  )
}
