import { type ReactNode } from 'react'
import { cn } from '../../lib/cn'
import { TopBar } from './TopBar'

/**
 * App layout with a fixed sidebar that never scrolls with the page.
 * Main content has a top bar and scrolls independently.
 */
export interface AppLayoutProps {
  /** Content rendered in the fixed sidebar */
  sidebar: ReactNode
  /** Main page content (scrolls independently) */
  children: ReactNode
  /** Top bar (default: TopBar with menu + profile). Set to null to hide. */
  topBar?: ReactNode | null
  /** Profile image URL for default TopBar avatar */
  profileSrc?: string
  /** Profile fallback for default TopBar avatar */
  profileFallback?: string
  /** Optional class for the root container */
  className?: string
}

export function AppLayout({
  sidebar,
  children,
  topBar,
  profileSrc,
  profileFallback,
  className,
}: AppLayoutProps) {
  const showTopBar = topBar !== null
  const resolvedTopBar =
    topBar === undefined ? (
      <TopBar profileSrc={profileSrc} profileFallback={profileFallback} />
    ) : (
      topBar
    )

  return (
    <div
      className={cn(
        'flex h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]',
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

      {/* Main content - top bar + scrollable area */}
      <main className="ml-60 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showTopBar && resolvedTopBar}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
