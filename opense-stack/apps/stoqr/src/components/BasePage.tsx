import type { ReactNode, CSSProperties } from 'react'
import { EmptyState } from './EmptyState'

export interface BasePageProps {
  companyId: string | null
  isLoading: boolean
  children: ReactNode
  loadingMessage?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  containerClassName?: string
  containerStyle?: CSSProperties
}

/**
 * BasePage - matches ETL page layout structure
 * Handles company validation, loading state, and EmptyState display
 * Wraps content in p-8 max-w-7xl mx-auto
 */
export const BasePage = ({
  companyId,
  isLoading,
  children,
  loadingMessage = 'Loading...',
  emptyStateTitle = 'No company selected',
  emptyStateDescription = 'Select a company to continue.',
  containerClassName = 'stack',
  containerStyle,
}: BasePageProps) => {
  if (!companyId) {
    return <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
  }

  if (isLoading) {
    return <div className="empty-state">{loadingMessage}</div>
  }

  return (
    <div className="p-8 max-w-7xl mx-auto">
      <div className={containerClassName} style={containerStyle}>
        {children}
      </div>
    </div>
  )
}
