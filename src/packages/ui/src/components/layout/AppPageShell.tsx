import type { CSSProperties, ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { EmptyState } from '../ui/EmptyState'

export const APP_PAGE_SHELL_CONTENT_CLASS_NAME =
  'app-page-shell flex h-full min-h-0 flex-col overflow-hidden bg-[var(--color-background)] px-[var(--app-page-gutter-x)] pb-[var(--app-page-gutter-bottom)]'

export const APP_PAGE_SHELL_CONTAINER_CLASS_NAME =
  '[&>*]:min-w-0 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-[var(--app-page-content-gap)] overflow-hidden text-[var(--color-foreground)]'

export interface AppPageShellProps {
  children: ReactNode
  isLoading?: boolean
  loadingMessage?: string
  emptyState?: { title: string; description: string }
  loadingState?: ReactNode
  contentClassName?: string
  contentStyle?: CSSProperties
  containerClassName?: string
  containerStyle?: CSSProperties
}

export const AppPageShell = ({
  children,
  isLoading = false,
  loadingMessage = 'Loading...',
  emptyState,
  loadingState,
  contentClassName,
  contentStyle,
  containerClassName,
  containerStyle,
}: AppPageShellProps) => {
  if (emptyState) {
    return <EmptyState title={emptyState.title} description={emptyState.description} />
  }

  if (isLoading) {
    return loadingState ?? <div className="empty-state">{loadingMessage}</div>
  }

  return (
    <div
      className={cn(
        APP_PAGE_SHELL_CONTENT_CLASS_NAME,
        contentClassName,
      )}
      style={contentStyle}
    >
      <div
        className={containerClassName ?? APP_PAGE_SHELL_CONTAINER_CLASS_NAME}
        style={containerStyle}
      >
        {children}
      </div>
    </div>
  )
}
