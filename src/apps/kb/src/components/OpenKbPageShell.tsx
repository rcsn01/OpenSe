import type { CSSProperties, ReactNode } from 'react'
import { AppPageShell, EmptyState } from '@repo/ui'

export const OpenKbPageShell = ({
  children,
  isLoading,
  loadingMessage = 'Loading Open-KB...',
  emptyStateTitle,
  emptyStateDescription,
  contentClassName,
  contentStyle,
  containerClassName,
  containerStyle,
}: {
  children: ReactNode
  isLoading?: boolean
  loadingMessage?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  contentClassName?: string
  contentStyle?: CSSProperties
  containerClassName?: string
  containerStyle?: CSSProperties
}) => {
  return (
    <AppPageShell
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      loadingState={<EmptyState title={loadingMessage} description="" />}
      emptyState={
        emptyStateTitle
          ? { title: emptyStateTitle, description: emptyStateDescription ?? '' }
          : undefined
      }
      contentClassName={contentClassName}
      contentStyle={contentStyle}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
    >
      {children}
    </AppPageShell>
  )
}
