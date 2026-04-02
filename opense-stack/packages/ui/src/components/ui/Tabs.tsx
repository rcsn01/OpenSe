import { type ReactNode, useState } from 'react'
import { cn } from '../../lib/cn'
import { ChevronDown } from 'lucide-react'
import { Label } from './Typography'

/* ── TabBar: props-based tab navigation ───────────────── */

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
  const containerCls = className ?? 'flex border-b border-[var(--color-border)] overflow-x-auto gap-4'
  const baseCls = itemClassName ?? 'pb-3 px-1 border-b-2 font-medium text-sm flex items-center gap-2 transition-all whitespace-nowrap'
  const activeCls = activeItemClassName ?? 'border-[var(--color-primary)] text-[var(--color-tab-active)]'
  const inactiveCls = inactiveItemClassName ?? 'border-transparent text-[var(--color-muted-foreground)] hover:text-[var(--color-foreground)] hover:border-[var(--color-border)]'

  return (
    <nav className={containerCls}>
      {tabs.map((t) => (
        <button key={t.id} onClick={() => onTabChange(t.id)} className={cn(baseCls, t.id === activeTab ? activeCls : inactiveCls)}>
          {t.icon}
          <Label className="font-inherit text-inherit">{t.label}</Label>
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
