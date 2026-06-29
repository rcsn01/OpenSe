import { type CSSProperties, type ReactNode, useMemo } from 'react'
import { AppPageShell } from '@repo/ui'
import { type PageTopBarSearchConfig, usePageTopBarSearch } from './Search/TopBarSearch'

export type StoqrPageShellProps = {
  companyId: string | null
  children: ReactNode
  search?: PageTopBarSearchConfig
  isLoading?: boolean
  loadingMessage?: string
  emptyStateTitle?: string
  emptyStateDescription?: string
  contentClassName?: string
  contentStyle?: CSSProperties
  containerClassName?: string
  containerStyle?: CSSProperties
}

const disabledSearchConfig: PageTopBarSearchConfig = {
  searchKey: 'stoqr-page-shell-disabled',
  enabled: false,
  placeholder: '',
}

export const StoqrPageShell = ({
  companyId,
  children,
  search,
  isLoading,
  loadingMessage,
  emptyStateTitle,
  emptyStateDescription,
  contentClassName,
  contentStyle,
  containerClassName,
  containerStyle,
}: StoqrPageShellProps) => {
  const searchConfig = useMemo(
    () => search ?? disabledSearchConfig,
    [search],
  )

  usePageTopBarSearch(searchConfig)

  const emptyState =
    !companyId
      ? {
          title: emptyStateTitle ?? 'No company selected',
          description: emptyStateDescription ?? 'Select a company to continue.',
        }
      : undefined

  return (
    <AppPageShell
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      emptyState={emptyState}
      contentClassName={contentClassName}
      contentStyle={contentStyle}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
    >
      {children}
    </AppPageShell>
  )
}
