import { type ReactNode } from 'react'
import { Menu } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Avatar } from '../ui/Avatar'

export interface TopBarProps {
  /** Optional left slot (empty by default) */
  left?: ReactNode
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
}: TopBarProps) {
  return (
    <header
      className={cn(
        'flex h-14 shrink-0 items-center justify-between gap-4 bg-[var(--color-white-12)] px-4',
        className,
      )}
    >
      <div className="flex items-center shrink-0">{left}</div>

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
            <Avatar src={profileSrc} fallback={profileFallback} size="sm" />
          </>
        )}
      </div>
    </header>
  )
}
