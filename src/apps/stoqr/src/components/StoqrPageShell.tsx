import { type CSSProperties, type ReactNode, useMemo } from 'react'
import { BasePage } from './BasePage'
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

const defaultContentClassName = 'flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]'
const defaultContainerClassName =
  '[&>*]:min-w-0 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-7 overflow-hidden text-[var(--color-foreground)]'

export const StoqrPageShell = ({
  companyId,
  children,
  search,
  isLoading,
  loadingMessage,
  emptyStateTitle,
  emptyStateDescription,
  contentClassName = defaultContentClassName,
  contentStyle,
  containerClassName = defaultContainerClassName,
  containerStyle,
}: StoqrPageShellProps) => {
  const searchConfig = useMemo(
    () => search ?? disabledSearchConfig,
    [search],
  )

  usePageTopBarSearch(searchConfig)

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      loadingMessage={loadingMessage}
      emptyStateTitle={emptyStateTitle}
      emptyStateDescription={emptyStateDescription}
      contentClassName={contentClassName}
      contentStyle={contentStyle}
      containerClassName={containerClassName}
      containerStyle={containerStyle}
    >
      {children}
    </BasePage>
  )
}
