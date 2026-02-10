import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/* ── Sidebar ──────────────────────────────────────────── */

interface SidebarProps {
  children: ReactNode
  className?: string
}

export function Sidebar({ children, className }: SidebarProps) {
  return (
    <aside
      className={cn(
        'flex h-screen w-64 flex-col border-r border-[var(--color-border)] bg-[var(--color-muted)]',
        className,
      )}
    >
      {children}
    </aside>
  )
}

interface SidebarHeaderProps {
  children: ReactNode
  className?: string
}

export function SidebarHeader({ children, className }: SidebarHeaderProps) {
  return <div className={cn('flex items-center gap-2 px-4 py-4 border-b border-[var(--color-border)]', className)}>{children}</div>
}

interface SidebarContentProps {
  children: ReactNode
  className?: string
}

export function SidebarContent({ children, className }: SidebarContentProps) {
  return <nav className={cn('flex-1 overflow-y-auto p-2', className)}>{children}</nav>
}

interface SidebarGroupProps {
  children: ReactNode
  title?: string
  className?: string
}

export function SidebarGroup({ children, title, className }: SidebarGroupProps) {
  return (
    <div className={cn('mb-2', className)}>
      {title && (
        <p className="px-2 py-1.5 text-xs font-semibold uppercase tracking-wider text-[var(--color-muted-foreground)]">
          {title}
        </p>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

interface SidebarItemProps {
  children: ReactNode
  active?: boolean
  onClick?: () => void
  icon?: ReactNode
  className?: string
}

export function SidebarItem({ children, active, onClick, icon, className }: SidebarItemProps) {
  return (
    <button
      onClick={onClick}
      className={cn(
        'flex w-full items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-sm transition-colors text-left',
        active
          ? 'bg-[var(--color-primary-light)] text-[var(--color-primary)] font-medium'
          : 'text-[var(--color-foreground)] hover:bg-[var(--color-background)]',
        className,
      )}
    >
      {icon && <span className="shrink-0 w-4 h-4 flex items-center justify-center">{icon}</span>}
      {children}
    </button>
  )
}
