import React from 'react';
import clsx from 'clsx';

export type TabItem = {
  id: string;
  label: string;
  icon?: React.ReactNode;
  count?: number;
};

type TabsProps = {
  tabs: TabItem[];
  activeTab: string;
  onTabChange: (id: string) => void;
  className?: string;
  itemClassName?: string;
  activeItemClassName?: string;
  inactiveItemClassName?: string;
};

const defaultContainer =
  'flex border-b border-slate-200 mb-8 overflow-x-auto gap-8';

const defaultItemBase =
  'pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap';

const defaultActive =
  'border-blue-600 text-blue-600';

const defaultInactive =
  'border-transparent text-slate-500 hover:text-slate-800 hover:border-slate-300';

export const Tabs: React.FC<TabsProps> = ({
  tabs,
  activeTab,
  onTabChange,
  className,
  itemClassName,
  activeItemClassName,
  inactiveItemClassName,
}) => {
  const containerClasses = className ? clsx(className) : defaultContainer;
  const baseItem = itemClassName ? clsx(itemClassName) : defaultItemBase;
  const activeItem = activeItemClassName ? clsx(activeItemClassName) : defaultActive;
  const inactiveItem = inactiveItemClassName ? clsx(inactiveItemClassName) : defaultInactive;

  return (
    <nav className={containerClasses}>
      {tabs.map((t) => {
        const isActive = t.id === activeTab;
        return (
          <button
            key={t.id}
            onClick={() => onTabChange(t.id)}
            className={clsx(baseItem, isActive ? activeItem : inactiveItem)}
          >
            {t.icon ? t.icon : null}
            <span>{t.label}</span>
            {typeof t.count === 'number' ? (
              <span className="ml-1 inline-flex items-center rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600">
                {t.count}
              </span>
            ) : null}
          </button>
        );
      })}
    </nav>
  );
};
