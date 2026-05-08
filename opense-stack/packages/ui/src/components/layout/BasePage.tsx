import type { ReactNode, CSSProperties } from 'react'
import { cn } from '../../lib/cn'
import { EmptyState } from '../ui/EmptyState'

export interface BasePageProps {
  children: ReactNode
  /** When provided, renders EmptyState instead of children */
  emptyState?: { title: string; description: string }
  /** When true, renders loading message instead of children */
  isLoading?: boolean
  loadingMessage?: string
  contentClassName?: string
  contentStyle?: CSSProperties
  containerClassName?: string
  containerStyle?: CSSProperties
}

/**
 * BasePage - shared page layout wrapper
 * Wraps content in base-page-content (padding via styles.css)
 * Supports optional empty state and loading state
 */
export const BasePage = ({
  children,
  emptyState,
  isLoading = false,
  loadingMessage = 'Loading...',
  contentClassName,
  contentStyle,
  containerClassName = 'stack',
  containerStyle,
}: BasePageProps) => {
  if (emptyState) {
    return <EmptyState title={emptyState.title} description={emptyState.description} />
  }

  if (isLoading) {
    return <div className="empty-state">{loadingMessage}</div>
  }

  return (
    <div className={cn('base-page-content', contentClassName)} style={contentStyle}>
      <div className={containerClassName} style={containerStyle}>
        {children}
      </div>
    </div>
  )
}
