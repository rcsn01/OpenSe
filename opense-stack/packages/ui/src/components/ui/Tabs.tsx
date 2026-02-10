import { type ReactNode, useState, createContext, useContext } from 'react'
import { cn } from '../../lib/cn'
import { ChevronDown } from 'lucide-react'

/* ── Compound Tabs ────────────────────────────────────── */

interface TabsContextValue { activeTab: string; setActiveTab: (v: string) => void }
const TabsContext = createContext<TabsContextValue>({ activeTab: '', setActiveTab: () => {} })

export function Tabs({ children, defaultValue, className }: { children: ReactNode; defaultValue: string; className?: string }) {
  const [activeTab, setActiveTab] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

export function TabsList({ children, className }: { children: ReactNode; className?: string }) {
  return (
    <div role="tablist" className={cn('inline-flex items-center gap-1 rounded-[var(--radius-lg)] bg-[var(--color-muted)] p-1', className)}>
      {children}
    </div>
  )
}

export function TabsTrigger({ children, value, className }: { children: ReactNode; value: string; className?: string }) {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  const isActive = activeTab === value
  return (
    <button
      role="tab" aria-selected={isActive} onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-all duration-[var(--transition-fast)]',
        isActive ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-[var(--shadow-sm)]' : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
        className,
      )}
    >{children}</button>
  )
}

export function TabsContent({ children, value, className }: { children: ReactNode; value: string; className?: string }) {
  const { activeTab } = useContext(TabsContext)
  if (activeTab !== value) return null
  return <div className={cn('mt-3', className)}>{children}</div>
}

/* ── TabBar (ETL compat: props-based tabs) ────────────── */

export type TabItem = { id: string; label: string; icon?: ReactNode; count?: number }

interface TabBarProps {
  tabs: TabItem[]
  activeTab: string
  onTabChange: (id: string) => void
  className?: string
  itemClassName?: string
  activeItemClassName?: string
  inactiveItemClassName?: string
}

export function TabBar({ tabs, activeTab, onTabChange, className, itemClassName, activeItemClassName, inactiveItemClassName }: TabBarProps) {
  const containerCls = className ?? 'flex border-b border-[var(--color-border)] mb-8 overflow-x-auto gap-8'
  const baseCls = itemClassName ?? 'pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap'
  const activeCls = activeItemClassName ?? 'border-[var(--color-primary)] text-[var(--color-primary)]'
  const inactiveCls = inactiveItemClassName ?? 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-border)]'

  return (
    <nav className={containerCls}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onTabChange(t.id)} className={cn(baseCls, t.id === activeTab ? activeCls : inactiveCls)}>
          {t.icon}
          <span>{t.label}</span>
          {typeof t.count === 'number' && (
            <span className="ml-1 inline-flex items-center rounded-full bg-[var(--color-muted)] px-2 py-0.5 text-xs font-medium">
              {t.count}
            </span>
          )}
        </button>
      ))}
    </nav>
  )
}

/* ── Accordion ────────────────────────────────────────── */

export function AccordionItem({ children, title, defaultOpen = false, className }: { children: ReactNode; title: string; defaultOpen?: boolean; className?: string }) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cn('border-b border-[var(--color-border)]', className)}>
      <button onClick={() => setOpen(!open)} className="flex w-full items-center justify-between py-3 text-sm font-medium hover:underline transition-all">
        {title}
        <ChevronDown className={cn('h-4 w-4 shrink-0 transition-transform duration-200', open && 'rotate-180')} />
      </button>
      {open && <div className="pb-3 text-sm text-[var(--color-muted-foreground)]">{children}</div>}
    </div>
  )
}
