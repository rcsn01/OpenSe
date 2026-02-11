import type { ReactNode, CSSProperties } from 'react'
import { EmptyState } from '../ui/EmptyState'

export interface BasePageProps {
  children: ReactNode
  /** When provided, renders EmptyState instead of children */
  emptyState?: { title: string; description: string }
  /** When true, renders loading message instead of children */
  isLoading?: boolean
  loadingMessage?: string
  containerClassName?: string
  containerStyle?: CSSProperties
}

/**
 * BasePage - shared page layout wrapper
 * Wraps content in base-page-content (padding via styles.css) max-w-7xl mx-auto
 * Supports optional empty state and loading state
 */
export const BasePage = ({
  children,
  emptyState,
  isLoading = false,
  loadingMessage = 'Loading...',
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
    <div className="base-page-content max-w-7xl mx-auto">
      <div className={containerClassName} style={containerStyle}>
        {children}
      </div>
    </div>
  )
}
