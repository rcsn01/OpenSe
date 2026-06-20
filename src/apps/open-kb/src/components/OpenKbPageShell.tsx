import type { ReactNode } from 'react'
import { EmptyState } from '@repo/ui'

export const OpenKbPageShell = ({
  children,
  isLoading,
  loadingMessage = 'Loading Open-KB...',
  emptyStateTitle,
  emptyStateDescription,
}: {
  children: ReactNode
  isLoading?: boolean
  loadingMessage?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
}) => {
  if (isLoading) {
    return <EmptyState title={loadingMessage} description="" />
  }

  if (emptyStateTitle) {
    return <EmptyState title={emptyStateTitle} description={emptyStateDescription ?? ''} />
  }

  return (
    <div className="flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]">
      <div className="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto px-2 text-[var(--color-foreground)]">
        {children}
      </div>
    </div>
  )
}
