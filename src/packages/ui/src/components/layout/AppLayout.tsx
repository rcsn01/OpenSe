import { type ReactNode, useCallback, useRef } from 'react'
import { cn } from '../../lib/cn'
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
  /** Optional callback for profile menu Profile item */
  onProfileClick?: () => void
  /** Optional callback for profile menu Settings item */
  onSettingsClick?: () => void
  /** Optional callback for profile menu Log out item */
  onLogout?: () => void
  /** Search placeholder (enables search bar when provided with searchValue and onSearchChange) */
  searchPlaceholder?: string
  /** Optional custom search content rendered in the top bar search slot */
  searchContent?: ReactNode
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
    onToggle?: () => void
    onOpen?: () => void
    onClose?: () => void
    toggleAriaLabel?: string
  }
}

export function AppLayout({
  sidebar,
  children,
  topBar,
  profileSrc,
  profileFallback,
  onProfileClick,
  onSettingsClick,
  onLogout,
  searchPlaceholder,
  searchContent,
  searchValue,
  onSearchChange,
  className,
  mobileSidebar,
}: AppLayoutProps) {
  const touchStartXRef = useRef<number | null>(null)
  const isMobileSidebarEnabled = Boolean(mobileSidebar?.enabled)
  const isMobileSidebarOpen = Boolean(mobileSidebar?.isOpen)

  const openMobileSidebar = useCallback(() => {
    if (!isMobileSidebarEnabled || isMobileSidebarOpen) return
    if (mobileSidebar?.onOpen) {
      mobileSidebar.onOpen()
      return
    }
    mobileSidebar?.onToggle?.()
  }, [isMobileSidebarEnabled, isMobileSidebarOpen, mobileSidebar])

  const closeMobileSidebar = useCallback(() => {
    if (!isMobileSidebarEnabled || !isMobileSidebarOpen) return
    if (mobileSidebar?.onClose) {
      mobileSidebar.onClose()
      return
    }
    mobileSidebar?.onToggle?.()
  }, [isMobileSidebarEnabled, isMobileSidebarOpen, mobileSidebar])

  const handleSidebarTouchStart = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!isMobileSidebarEnabled || !isMobileSidebarOpen) return
      touchStartXRef.current = event.changedTouches[0]?.clientX ?? null
    },
    [isMobileSidebarEnabled, isMobileSidebarOpen],
  )

  const handleSidebarTouchEnd = useCallback(
    (event: React.TouchEvent<HTMLElement>) => {
      if (!isMobileSidebarEnabled || !isMobileSidebarOpen) return
      const touchStartX = touchStartXRef.current
      touchStartXRef.current = null
      if (touchStartX == null) return

      const touchEndX = event.changedTouches[0]?.clientX
      if (touchEndX == null) return

      const horizontalDelta = touchEndX - touchStartX
      if (horizontalDelta <= -40) {
        closeMobileSidebar()
      }
    },
    [closeMobileSidebar, isMobileSidebarEnabled, isMobileSidebarOpen],
  )

  const handleSidebarTouchCancel = useCallback(() => {
    touchStartXRef.current = null
  }, [])

  const showTopBar = topBar !== null
  const resolvedTopBar =
    topBar === undefined ? (
      <SwitchAppTopBar
        profileSrc={profileSrc}
        profileFallback={profileFallback}
        onProfileClick={onProfileClick}
        onSettingsClick={onSettingsClick}
        onLogout={onLogout}
        searchContent={searchContent}
        searchPlaceholder={searchPlaceholder}
        searchValue={searchValue}
        onSearchChange={onSearchChange}
        mobileSidebarToggle={{
          enabled: isMobileSidebarEnabled,
          isOpen: isMobileSidebarOpen,
          onOpen: openMobileSidebar,
          ariaLabel: mobileSidebar?.toggleAriaLabel,
        }}
      />
    ) : (
      topBar
    )

  return (
    <div
      className={cn(
        'app-layout fixed inset-0 flex h-screen overflow-hidden bg-[var(--color-background)] text-[var(--color-foreground)]',
        isMobileSidebarEnabled ? 'app-layout-mobile-enabled' : 'app-layout-mobile-disabled',
        isMobileSidebarEnabled && isMobileSidebarOpen ? 'app-layout-mobile-open' : 'app-layout-mobile-closed',
        className,
      )}
    >
      {/* Fixed sidebar - never scrolls with the screen */}
      <aside
        className="app-sidebar fixed inset-y-0 left-0 z-50 flex h-screen w-[220px] shrink-0 flex-col"
        aria-label="Sidebar navigation"
        onTouchStart={handleSidebarTouchStart}
        onTouchEnd={handleSidebarTouchEnd}
        onTouchCancel={handleSidebarTouchCancel}
      >
        {sidebar}
      </aside>

      {isMobileSidebarEnabled && isMobileSidebarOpen ? (
        <button
          type="button"
          className="app-sidebar-backdrop fixed inset-0 z-40 md:hidden"
          aria-label="Close side navigation"
          onClick={closeMobileSidebar}
        />
      ) : null}

      {/* Main content - top bar + scrollable area */}
      <main className="app-layout-main ml-[220px] flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
        {showTopBar && resolvedTopBar}
        <div data-app-scroll-container className="min-h-0 flex-1 overflow-y-auto">
          {children}
        </div>
      </main>
    </div>
  )
}
