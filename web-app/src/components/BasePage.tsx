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
 * BasePage HOC for Tab-based pages
 * Handles company validation, loading state, and EmptyState display
 * 
 * Usage:
 * <BasePage companyId={companyId} isLoading={isLoading}>
 *   <Tabs tabs={[...]} />
 * </BasePage>
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
  // Check if company is selected
  if (!companyId) {
    return <EmptyState title={emptyStateTitle} description={emptyStateDescription} />
  }

  // Show loading state
  if (isLoading) {
    return <div className="empty-state">{loadingMessage}</div>
  }

  // Render page content wrapped in container
  return (
    <div className={containerClassName} style={containerStyle}>
      {children}
    </div>
  )
}
