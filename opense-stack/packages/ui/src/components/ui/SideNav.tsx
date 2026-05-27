import { type ReactNode } from 'react'
import { User, LogOut } from 'lucide-react'
import { cn } from '../../lib/cn'
import { Label, SubLabel } from './Typography'

/* ── SideNavItem: styling only – apps provide icon & text via children ── */

export interface SideNavItemProps {
  /** Content: app provides icon + label (or anything) */
  children: ReactNode
  /** Whether this item is active */
  active?: boolean
  /** For button: click handler */
  onClick?: () => void
  /** For link: render as link (e.g. NavLink). Receives our computed className and children. */
  renderLink?: (props: { className: string; children: ReactNode; onClick?: () => void }) => ReactNode
}

const sideNavItemBase =
  'flex items-center gap-2 rounded-[var(--radius-md)] px-2 py-1.5 text-sm text-left transition-colors w-full'
const sideNavItemActive =
  'bg-[var(--color-side-nav-active-bg)] text-[var(--color-side-nav-active-foreground)]'
const sideNavItemInactive =
  'text-[var(--color-foreground)] hover:bg-[var(--color-muted)]'

const sideNavItemLabelClass =
  'flex items-center gap-2 w-full m-0 p-0 font-inherit text-inherit'

export function SideNavItem({ children, active, onClick, renderLink }: SideNavItemProps) {
  const className = cn(
    sideNavItemBase,
    active ? sideNavItemActive : sideNavItemInactive,
  )

  const wrappedChildren = (
    <Label className={sideNavItemLabelClass}>
      {children}
    </Label>
  )

  if (renderLink) {
    return <>{renderLink({ className, children: wrappedChildren, onClick })}</>
  }

  return (
    <button type="button" className={className} onClick={onClick}>
      {wrappedChildren}
    </button>
  )
}

/* ── SideNav: container – defines layout, gap between items ── */

export interface SideNavProps {
  /** Nav items – app renders SideNavItem with own icon & text */
  children: ReactNode
}

export function SideNav({ children }: SideNavProps) {
  return (
    <nav className="side-nav flex-1 overflow-y-auto p-2">
      <div className="flex flex-col gap-0.5">{children}</div>
    </nav>
  )
}

/* ── Page categories: shared labels so apps don't define their own ── */

export const SIDE_NAV_CATEGORIES = {
  main: 'MAIN',
  configuration: 'CONFIGURATION',
  settings: 'SETTINGS',
  tools: 'TOOLS',
  reports: 'REPORTS',
  foundation: 'FOUNDATION',
  components: 'COMPONENTS',
  layout: 'LAYOUT',
  'test-pages': 'TEST PAGES',
} as const

export type SideNavCategory = keyof typeof SIDE_NAV_CATEGORIES

/* ── SideNavGroup: optional grouped nav with section title ── */

export interface SideNavGroupProps {
  /** Predefined category label (use this instead of title for consistency) */
  category?: SideNavCategory
  /** Custom title (overrides category when provided) */
  title?: string
  children: ReactNode
}

export function SideNavGroup({ category, title, children }: SideNavGroupProps) {
  const label = title ?? (category ? SIDE_NAV_CATEGORIES[category] : undefined)
  return (
    <div className="flex flex-col gap-0.5">
      {label && (
        <SubLabel as="div" className="px-2 uppercase tracking-wider">
          {label}
        </SubLabel>
      )}
      <div className="flex flex-col gap-0.5">{children}</div>
    </div>
  )
}

/* ── SideNavBrandSlot: shared brand header (icon + name + version + theme toggle) ── */

export interface SideNavBrandSlotProps {
  /** Icon or logo (ReactNode: e.g. "UD" text, or <Palette /> icon) */
  icon: ReactNode
  /** App name */
  name: string
  /** Version string (e.g. "v1.0") */
  version?: string
  /** Optional extra trailing slot */
  trailing?: ReactNode
}

export function SideNavBrandSlot({
  icon,
  name,
  version,
  trailing,
}: SideNavBrandSlotProps) {
  return (
    <div className="side-nav-brand-slot flex h-14 shrink-0 items-center px-4">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0 flex-1">
          <div className="w-9 h-9 rounded-[10px] bg-[var(--color-surface-subtle)] text-[var(--color-foreground)] grid place-items-center font-extrabold text-base shrink-0 ring-1 ring-inset ring-[var(--color-border)] [&>svg]:w-5 [&>svg]:h-5">
            {icon}
          </div>
          <div className="flex flex-col leading-tight overflow-hidden min-w-0">
            <span className="text-[var(--color-foreground)] font-semibold text-base tracking-tight truncate">
              {name}
            </span>
            {version && (
              <span className="text-xs text-[var(--color-muted-foreground)]">{version}</span>
            )}
          </div>
        </div>
        {trailing && (
          <div className="flex items-center gap-1 shrink-0">
            {trailing}
          </div>
        )}
      </div>
    </div>
  )
}

/* ── SideNavGroupList: wrapper for multiple groups (gap between groups) ── */

export interface SideNavGroupListProps {
  children: ReactNode
}

export function SideNavGroupList({ children }: SideNavGroupListProps) {
  return <div className="flex flex-col gap-4">{children}</div>
}

/* ── SideNavUserProfile: optional user block (app-specific, but common pattern) ── */

export interface SideNavUserProfileProps {
  userName?: string
  userEmail?: string
  onLogout?: () => void
  signingOut?: boolean
}

export function SideNavUserProfile({
  userName,
  userEmail,
  onLogout,
  signingOut,
}: SideNavUserProfileProps) {
  return (
    <div className="shrink-0 p-4">
      <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--color-background)]">
        <div className="w-9 h-9 rounded-full bg-[var(--color-muted)] text-[var(--color-muted-foreground)] grid place-items-center shrink-0">
          <User className="w-[18px] h-[18px]" />
        </div>
        <div className="flex-1 min-w-0 flex flex-col">
          <span className="text-[13px] font-medium text-[var(--color-foreground)] truncate">
            {userName ?? 'User'}
          </span>
          <span className="text-[11px] text-[var(--color-muted-foreground)] truncate">
            {userEmail ?? ''}
          </span>
        </div>
        {onLogout && (
          <button
            type="button"
            onClick={onLogout}
            disabled={signingOut}
            className="shrink-0 p-2 rounded-md text-[var(--color-muted-foreground)] hover:bg-[var(--color-destructive-light)] hover:text-[var(--color-destructive)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            title="Log out"
          >
            <LogOut className="w-[18px] h-[18px]" />
          </button>
        )}
      </div>
    </div>
  )
}
