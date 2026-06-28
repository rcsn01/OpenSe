import type { ReactNode } from 'react'
import { EmptyState } from '@repo/ui'

export const OpenKbPageShell = ({
  children,
  topSlot,
  isLoading,
  loadingMessage = 'Loading Open-KB...',
  emptyStateTitle,
  emptyStateDescription,
}: {
  children: ReactNode
  topSlot?: ReactNode
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

  const hasTopSlot = Boolean(topSlot)

  return (
    <div className={`flex h-full min-h-0 flex-col overflow-hidden px-2 pb-8 ${hasTopSlot ? 'pt-0' : 'pt-[18px]'}`}>
      {topSlot ? (
        <div className="shrink-0 text-[var(--color-foreground)]">
          {topSlot}
        </div>
      ) : null}
      <div className={`flex h-full min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-y-auto text-[var(--color-foreground)] ${hasTopSlot ? 'pt-4' : ''}`}>
        {children}
      </div>
    </div>
  )
}
