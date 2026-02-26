import { type ReactNode } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Button } from '../ui/Button'
import { SwitchAppTopBar } from './SwitchAppTopBar'

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
  /** Optional callback for profile menu Settings item */
  onSettingsClick?: () => void
  /** Optional callback for profile menu Log out item */
  onLogout?: () => void
  /** Search placeholder (enables search bar when provided with searchValue and onSearchChange) */
  searchPlaceholder?: string
  /** Search input value */
  searchValue?: string
  /** Search input change handler */
  onSearchChange?: (value: string) => void
  /** Optional class for the root container */
  className?: string
  /** Mobile sidebar toggle behavior for small screens */
  mobileSidebar?: {
    enabled: boolean
    isOpen: boolean
    onToggle: () => void
    toggleAriaLabel?: string
  }
}

export function AppLayout({
  sidebar,
  children,
  topBar,
  profileSrc,
  profileFallback,
  onSettingsClick,
  onLogout,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  className,
  mobileSidebar,
}: AppLayoutProps) {
  const isMobileSidebarEnabled = Boolean(mobileSidebar?.enabled)
  const isMobileSidebarOpen = Boolean(mobileSidebar?.isOpen)

  const showTopBar = topBar !== null
  const resolvedTopBar =
    topBar === undefined ? (
      <SwitchAppTopBar
        profileSrc={profileSrc}
        profileFallback={profileFallback}
        onSettingsClick={onSettingsClick}
        onLogout={onLogout}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
      />
    ) : (
      topBar
    )

  return (
    <div
      className={cn(
        'app-layout flex h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]',
        isMobileSidebarEnabled ? 'app-layout-mobile-enabled' : 'app-layout-mobile-disabled',
        isMobileSidebarEnabled && isMobileSidebarOpen ? 'app-layout-mobile-open' : 'app-layout-mobile-closed',
        className,
      )}
    >
      {/* Fixed sidebar - never scrolls with the screen */}
      <aside
        className="app-sidebar fixed inset-y-0 left-0 z-50 flex h-screen w-60 shrink-0 flex-col"
        aria-label="Sidebar navigation"
      >
        {sidebar}
        {isMobileSidebarEnabled ? (
          <Button
            type="button"
            variant="outline"
            size="icon"
            className="mobile-sidebar-toggle absolute left-full top-7 z-[70] -translate-y-1/2 md:hidden"
            aria-label={mobileSidebar?.toggleAriaLabel ?? 'Toggle side navigation'}
            aria-pressed={isMobileSidebarOpen}
            onClick={mobileSidebar?.onToggle}
          >
            {isMobileSidebarOpen ? <ChevronLeft className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
          </Button>
        ) : null}
      </aside>

      {/* Main content - top bar + scrollable area */}
      <main className="app-layout-main ml-60 flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showTopBar && resolvedTopBar}
        <div className="min-h-0 flex-1 overflow-y-auto">{children}</div>
      </main>
    </div>
  )
}
