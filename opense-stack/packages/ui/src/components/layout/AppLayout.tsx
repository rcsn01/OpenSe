import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'

/**
 * App layout with a fixed sidebar that never scrolls with the page.
 * Main content scrolls independently.
 */
export interface AppLayoutProps {
  /** Content rendered in the fixed sidebar */
  sidebar: ReactNode
  /** Main page content (scrolls independently) */
  children: ReactNode
  /** Optional class for the root container */
  className?: string
}

export function AppLayout({ sidebar, children, className }: AppLayoutProps) {
  return (
    <div
      className={cn(
        'flex min-h-screen bg-[var(--color-background)] text-[var(--color-foreground)]',
        className,
      )}
    >
      {/* Fixed sidebar - never scrolls with the screen */}
      <aside
        className="fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col border-r border-[var(--color-border)] bg-[var(--color-muted)]"
        aria-label="Sidebar navigation"
      >
        {sidebar}
      </aside>

      {/* Main content - scrolls independently */}
      <main className="ml-60 min-h-screen flex-1 overflow-y-auto">{children}</main>
    </div>
  )
}
