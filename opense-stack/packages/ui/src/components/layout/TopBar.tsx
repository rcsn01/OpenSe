import { type ReactNode } from 'react'
import { Menu, Search } from 'lucide-react'
import { cn } from '../../lib/cn'
import { ProfileDropdown } from '../ui/ProfileDropdown'
import { Input } from '../ui/Input'

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
}: TopBarProps) {
  const hasSearch = searchPlaceholder != null && searchValue != null && onSearchChange != null
  const leftContent = hasSearch ? (
    <Input
      placeholder={searchPlaceholder}
      value={searchValue}
      onChange={(e) => onSearchChange(e.target.value)}
      prefix={<Search className="w-4 h-4" />}
      className="max-w-xs rounded-[var(--radius-lg)]"
    />
  ) : left

  return (
    <header
      className={cn(
        'app-top-bar flex h-14 shrink-0 items-center justify-between gap-4 px-4',
        className,
      )}
    >
      <div className="flex items-center shrink-0">{leftContent}</div>

      {/* Empty center */}
      <div className="flex-1 min-w-0" />

      <div className="flex items-center shrink-0 gap-2">
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
