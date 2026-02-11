import type { ReactNode, CSSProperties } from 'react'
import { BasePage as SharedBasePage, type BasePageProps } from '@repo/ui'

export interface StoqrBasePageProps extends Omit<BasePageProps, 'emptyState'> {
  companyId: string | null
  emptyStateTitle?: string
  emptyStateDescription?: string
}

/**
 * Stoqr-specific BasePage wrapper - maps companyId to shared BasePage emptyState
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
}: StoqrBasePageProps) => {
  const emptyState =
    !companyId
      ? { title: emptyStateTitle, description: emptyStateDescription }
      : undefined

  return (
    <SharedBasePage
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      emptyState={emptyState}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
    >
      {children}
    </SharedBasePage>
  )
}
