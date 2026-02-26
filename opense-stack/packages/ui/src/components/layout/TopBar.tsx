import { type ReactNode } from 'react'
import { Menu, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ProfileDropdown } from '../ui/ProfileDropdown'
import { Input } from '../ui/Input'
import { Button } from '../ui/Button'

export interface MobileSidebarToggleProps {
  enabled: boolean
  isOpen: boolean
  onOpen: () => void
  ariaLabel?: string
}

export interface TopBarProps {
  /** Optional left slot (empty by default). Ignored when search props are provided. */
  left?: ReactNode
  /** Search placeholder (enables search bar when provided with searchValue and onSearchChange) */
  searchPlaceholder?: string
  /** Search input value */
  searchValue?: string
  /** Search input change handler */
  onSearchChange?: (value: string) => void
  /** Optional right slot (default: menu button + profile avatar) */
  right?: ReactNode
  /** Callback when menu button is clicked (only used when right is not provided) */
  onMenuClick?: () => void
  /** Profile image URL for default avatar */
  profileSrc?: string
  /** Profile fallback/initials when no image */
  profileFallback?: string
  /** Additional class for the bar */
  className?: string
  /** Optional callback for profile menu Settings item */
  onSettingsClick?: () => void
  /** Optional callback for profile menu Log out item */
  onLogout?: () => void
  /** Optional mobile side navigation open button */
  mobileSidebarToggle?: MobileSidebarToggleProps
}

/**
 * Top bar for the main content area. Empty by default with profile photo on right.
 * Use left/right slots to customize.
 */
export function TopBar({
  left,
  right,
  profileSrc,
  profileFallback,
  onMenuClick,
  className,
  onSettingsClick,
  onLogout,
  searchPlaceholder,
  searchValue,
  onSearchChange,
  mobileSidebarToggle,
}: TopBarProps) {
  const hasSearch = searchPlaceholder != null && searchValue != null && onSearchChange != null
  const showMobileSidebarToggle = Boolean(mobileSidebarToggle?.enabled)
  const leftContent = hasSearch ? (
    <div className="min-w-0 flex-1 max-w-xs">
      <Input
        placeholder={searchPlaceholder}
        value={searchValue}
        onChange={(e) => onSearchChange(e.target.value)}
        prefix={<Search className="w-4 h-4" />}
        className="rounded-[var(--radius-lg)]"
      />
    </div>
  ) : left

  return (
    <header
      className={cn(
        'app-top-bar flex h-14 shrink-0 items-center justify-between gap-4 px-[var(--gap-4)] py-0 min-w-0',
        className,
      )}
    >
      <div
        className={cn(
          'flex items-center gap-2',
          hasSearch ? 'min-w-0 flex-1' : 'shrink-0',
        )}
      >
        {showMobileSidebarToggle ? (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            className="mobile-sidebar-toggle shrink-0 md:hidden"
            aria-label={mobileSidebarToggle?.ariaLabel ?? 'Toggle side navigation'}
            aria-pressed={mobileSidebarToggle?.isOpen}
            onClick={mobileSidebarToggle?.onOpen}
          >
            <Menu className="h-4 w-4" />
          </Button>
        ) : null}
        {leftContent}
      </div>

      {!hasSearch && <div className="flex-1 min-w-0" />}

      <div className="flex shrink-0 items-center gap-2">
        {right ?? (
          <>
            <button
              type="button"
              onClick={onMenuClick}
              className="rounded-[var(--radius-md)] p-1.5 hover:bg-[var(--color-muted)] transition-colors"
              aria-label="Open menu"
            >
              <Menu className="h-4 w-4" />
            </button>
            <ProfileDropdown
              profileSrc={profileSrc}
              profileFallback={profileFallback}
              onSettingsClick={onSettingsClick}
              onLogout={onLogout}
            />
          </>
        )}
      </div>
    </header>
  )
}
