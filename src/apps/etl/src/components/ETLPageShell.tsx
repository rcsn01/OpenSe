import { type CSSProperties, type ReactNode, useMemo } from 'react';
import { BasePage } from '@repo/ui';
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

const defaultContentClassName = 'flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]';
const defaultContainerClassName =
  '[&>*]:min-w-0 flex h-full min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden text-[var(--color-foreground)]';

export const ETLPageShell = ({
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
}: ETLPageShellProps) => {
  const searchConfig = useMemo(
    () => search ?? disabledSearchConfig,
    [search],
  );

  usePageTopBarSearch(searchConfig);

  return (
    <BasePage
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
    </BasePage>
  );
};
