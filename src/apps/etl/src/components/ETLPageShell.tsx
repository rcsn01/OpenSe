import { type CSSProperties, type ReactNode, useMemo } from 'react';
import { AppPageShell } from '@repo/ui';
import { type PageTopBarSearchConfig, usePageTopBarSearch } from './Search/TopBarSearch';

type ETLPageShellProps = {
  children: ReactNode;
  search?: PageTopBarSearchConfig;
  isLoading?: boolean;
  loadingMessage?: string;
  emptyStateTitle?: string;
  emptyStateDescription?: string;
  contentClassName?: string;
  contentStyle?: CSSProperties;
  containerClassName?: string;
  containerStyle?: CSSProperties;
};

const disabledSearchConfig: PageTopBarSearchConfig = {
  searchKey: 'etl-page-shell-disabled',
  enabled: false,
  placeholder: '',
};

export const ETLPageShell = ({
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
}: ETLPageShellProps) => {
  const searchConfig = useMemo(
    () => search ?? disabledSearchConfig,
    [search],
  );

  usePageTopBarSearch(searchConfig);

  return (
    <AppPageShell
      isLoading={isLoading}
      loadingMessage={loadingMessage}
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
  );
};
