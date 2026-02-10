import { type ReactNode, useState, createContext, useContext } from 'react'
import { cn } from '../../lib/cn'
import { ChevronDown } from 'lucide-react'

/* ── Tabs ─────────────────────────────────────────────── */

interface TabsContextValue {
  activeTab: string
  setActiveTab: (value: string) => void
}

const TabsContext = createContext<TabsContextValue>({ activeTab: '', setActiveTab: () => {} })

interface TabsProps {
  children: ReactNode
  defaultValue: string
  className?: string
}

export function Tabs({ children, defaultValue, className }: TabsProps) {
  const [activeTab, setActiveTab] = useState(defaultValue)
  return (
    <TabsContext.Provider value={{ activeTab, setActiveTab }}>
      <div className={cn('w-full', className)}>{children}</div>
    </TabsContext.Provider>
  )
}

interface TabsListProps {
  children: ReactNode
  className?: string
}

export function TabsList({ children, className }: TabsListProps) {
  return (
    <div
      role="tablist"
      className={cn(
        'inline-flex items-center gap-1 rounded-[var(--radius-lg)] bg-[var(--color-muted)] p-1',
        className,
      )}
    >
      {children}
    </div>
  )
}

interface TabsTriggerProps {
  children: ReactNode
  value: string
  className?: string
}

export function TabsTrigger({ children, value, className }: TabsTriggerProps) {
  const { activeTab, setActiveTab } = useContext(TabsContext)
  const isActive = activeTab === value
  return (
    <button
      role="tab"
      aria-selected={isActive}
      onClick={() => setActiveTab(value)}
      className={cn(
        'inline-flex items-center justify-center whitespace-nowrap rounded-[var(--radius-md)] px-3 py-1.5 text-sm font-medium transition-all duration-[var(--transition-fast)]',
        isActive
          ? 'bg-[var(--color-card)] text-[var(--color-foreground)] shadow-[var(--shadow-sm)]'
          : 'text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)]',
        className,
      )}
    >
      {children}
    </button>
  )
}

interface TabsContentProps {
  children: ReactNode
  value: string
  className?: string
}

export function TabsContent({ children, value, className }: TabsContentProps) {
  const { activeTab } = useContext(TabsContext)
  if (activeTab !== value) return null
  return <div className={cn('mt-3', className)}>{children}</div>
}

/* ── Accordion ────────────────────────────────────────── */

interface AccordionItemProps {
  children: ReactNode
  title: string
  defaultOpen?: boolean
  className?: string
}

export function AccordionItem({ children, title, defaultOpen = false, className }: AccordionItemProps) {
  const [open, setOpen] = useState(defaultOpen)
  return (
    <div className={cn('border-b border-[var(--color-border)]', className)}>
      <button
        onClick={() => setOpen(!open)}
        className="flex w-full items-center justify-between py-3 text-sm font-medium hover:underline transition-all"
      >
        {title}
        <ChevronDown
          className={cn('h-4 w-4 shrink-0 transition-transform duration-200', open && 'rotate-180')}
        />
      </button>
      {open && <div className="pb-3 text-sm text-[var(--color-muted-foreground)]">{children}</div>}
    </div>
  )
}
