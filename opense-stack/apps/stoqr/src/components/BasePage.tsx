import type { ReactNode, CSSProperties } from 'react'
import { EmptyState } from './EmptyState'

export interface BasePageProps {
  companyId: string | null
  isLoading: boolean
  children: ReactNode
  /** Page title (matches ETL h1 style) */
  title?: string
  /** Page subtitle (matches ETL p style) */
  subtitle?: string
  loadingMessage?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  containerClassName?: string
  containerStyle?: CSSProperties
}

/**
 * BasePage - matches ETL page layout structure
 * Handles company validation, loading state, and EmptyState display
 * Wraps content in p-8 max-w-7xl mx-auto with optional header
 */
export const BasePage = ({
  companyId,
  isLoading,
  children,
  title,
  subtitle,
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
      {(title || subtitle) && (
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-8 gap-4">
          <div>
            {title && <h1 className="text-2xl font-bold text-slate-900">{title}</h1>}
            {subtitle && <p className="text-slate-500 mt-1">{subtitle}</p>}
          </div>
        </div>
      )}
      <div className={containerClassName} style={containerStyle}>
        {children}
      </div>
    </div>
  )
}
