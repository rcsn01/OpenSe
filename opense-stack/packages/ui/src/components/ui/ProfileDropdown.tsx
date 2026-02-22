import { type ReactNode } from 'react'
import { Dropdown, DropdownItem, DropdownSeparator } from './Dropdown'
import { Avatar } from './Avatar'

export interface ProfileDropdownProps {
  /** Profile image URL */
  profileSrc?: string
  /** Fallback/initials when no image */
  profileFallback?: string
  /** Callback when Settings is clicked */
  onSettingsClick?: () => void
  /** Callback when Log out is clicked */
  onLogout?: () => void
  /** Optional extra menu items before the separator */
  children?: ReactNode
}

/**
 * Shared profile dropdown with Settings and Log out.
 * Use with onLogout from useAuth().logout() for consistent logout across apps.
 */
export function ProfileDropdown({
  profileSrc,
  profileFallback,
  onSettingsClick,
  onLogout,
  children,
}: ProfileDropdownProps) {
  return (
    <Dropdown
      align="right"
      trigger={(open) => (
        <button
          type="button"
          aria-label="Open profile menu"
          aria-haspopup="menu"
          aria-expanded={open}
          className="rounded-[var(--radius-md)] p-0.5 hover:bg-[var(--color-muted)] transition-colors"
        >
          <Avatar src={profileSrc} fallback={profileFallback} size="sm" />
        </button>
      )}
    >
      {children}
      <DropdownItem onClick={onSettingsClick}>Settings</DropdownItem>
      <DropdownSeparator />
      <DropdownItem onClick={onLogout} destructive>
        Log out
      </DropdownItem>
    </Dropdown>
  )
}
