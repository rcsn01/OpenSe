import type { ReactNode } from 'react'
import { Button, EmptyState, cn } from '@repo/ui'
import { Maximize2, X } from 'lucide-react'

export type EntityPreviewPaneShellProps = {
  title?: ReactNode
  leading?: ReactNode
  children?: ReactNode
  headerActions?: ReactNode
  isLoading?: boolean
  loadingLabel?: string
  notFoundTitle?: string
  notFoundDescription?: string
  onExpand?: () => void
  onClose: () => void
  expandLabel?: string
  closeLabel?: string
  className?: string
}

export const EntityPreviewPaneShell = ({
  title,
  leading,
  children,
  headerActions,
  isLoading = false,
  loadingLabel = 'Loading...',
  notFoundTitle,
  notFoundDescription,
  onExpand,
  onClose,
  expandLabel = 'Expand preview',
  closeLabel = 'Close preview',
  className,
}: EntityPreviewPaneShellProps) => {
  const body = isLoading ? (
    <div className="flex min-h-0 flex-1 items-center justify-center text-sm text-[var(--color-muted-foreground)]">
      {loadingLabel}
    </div>
  ) : notFoundTitle ? (
    <div className="flex min-h-0 flex-1 items-center justify-center p-6">
      <EmptyState title={notFoundTitle} description={notFoundDescription ?? ''} />
    </div>
  ) : (
    <div className="min-h-0 flex-1 overflow-auto">
      {children}
    </div>
  )

  return (
    <aside className={cn('flex h-full w-full min-w-0 flex-col border-l border-[var(--color-border)] bg-[var(--color-background)]', className)}>
      <div className="flex h-12 shrink-0 items-center justify-between border-b border-[var(--color-border)] px-4">
        <div className="flex min-w-0 items-center gap-3">
          {leading}
          {title ? <h2 className="truncate text-sm font-semibold">{title}</h2> : null}
        </div>
        <div className="flex shrink-0 items-center gap-1">
          {headerActions}
          {onExpand ? (
            <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={expandLabel} onClick={onExpand}>
              <Maximize2 className="h-4 w-4" />
            </Button>
          ) : null}
          <Button type="button" variant="ghost" size="icon" className="h-8 w-8" aria-label={closeLabel} onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>
      {body}
    </aside>
  )
}
