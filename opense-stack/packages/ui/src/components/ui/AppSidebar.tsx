import { type ReactNode, useState, createContext, useContext } from 'react'
import { cn } from '../../lib/cn'
import { ChevronLeft, ChevronRight, Menu, X, LogOut, User } from 'lucide-react'

/* ── Types ────────────────────────────────────────────── */

export interface NavItem {
  label: string
  href: string
  icon?: ReactNode
}

export interface NavGroup {
  title?: string
  items: NavItem[]
}

export interface AppSidebarProps {
  /** Application brand name */
  brandName: string
  /** Short brand logo text (e.g. "OS", "ETL") */
  brandLogo?: string
  /** Brand version string */
  brandVersion?: string
  /** Main navigation groups */
  navigation: NavGroup[]
  /** Current pathname for active state */
  currentPath: string
  /** Callback when a nav item is clicked */
  onNavigate: (href: string) => void
  /** User display name */
  userName?: string
  /** User email */
  userEmail?: string
  /** Sign-out callback */
  onSignOut?: () => void
  /** Whether sign-out is in progress */
  signingOut?: boolean
  /** Optional header slot (e.g. org switcher) */
  headerSlot?: ReactNode
  /** Optional footer extra slot above user profile */
  footerSlot?: ReactNode
  /** Custom class */
  className?: string
  /** Collapsible sidebar (desktop) – default true */
  collapsible?: boolean
  /** Children rendered in the main content area */
  children?: ReactNode
}

/* ── Context for link rendering ───────────────────────── */

interface AppSidebarLinkRenderer {
  renderLink: (props: { href: string; className: string; onClick: () => void; children: ReactNode }) => ReactNode
}

const LinkRendererContext = createContext<AppSidebarLinkRenderer>({
  renderLink: ({ href, className, onClick, children }) => (
    <a href={href} className={className} onClick={(e) => { e.preventDefault(); onClick() }}>
      {children}
    </a>
  ),
})

export const AppSidebarLinkProvider = LinkRendererContext.Provider

export function useAppSidebarLinkRenderer() {
  return useContext(LinkRendererContext)
}

/* ── AppSidebar (complete sidebar + main layout) ──────── */

export function AppSidebar({
  brandName,
  brandLogo,
  brandVersion,
  navigation,
  currentPath,
  onNavigate,
  userName,
  userEmail,
  onSignOut,
  signingOut = false,
  headerSlot,
  footerSlot,
  className,
  collapsible = false,
  children,
}: AppSidebarProps) {
  const [isMobileOpen, setIsMobileOpen] = useState(false)
  const [isCollapsed, setIsCollapsed] = useState(false)
  const { renderLink } = useAppSidebarLinkRenderer()

  const handleNavigate = (href: string) => {
    onNavigate(href)
    setIsMobileOpen(false)
  }

  const sidebarContent = (
    <div className="flex flex-col h-full">
      {/* Brand Header */}
      <div className="p-5 flex items-center gap-3">
        {brandLogo && (
          <div className="w-9 h-9 rounded-[10px] bg-gradient-to-br from-blue-500 to-indigo-500 text-white grid place-items-center font-extrabold text-base shrink-0 shadow-[0_4px_12px_rgba(59,130,246,0.3)]">
            {brandLogo}
          </div>
        )}
        {!isCollapsed && (
          <div className="flex flex-col leading-tight overflow-hidden">
            <span className="text-[var(--sidebar-text)] font-semibold text-base tracking-[-0.01em] truncate">{brandName}</span>
            {brandVersion && <span className="text-xs text-[var(--sidebar-muted)]">{brandVersion}</span>}
          </div>
        )}
      </div>

      {/* Header Slot (e.g. org switcher) */}
      {headerSlot && !isCollapsed && (
        <div className="px-4 pb-3">{headerSlot}</div>
      )}

      {/* Navigation */}
      <div className="flex-1 overflow-y-auto px-4 py-4 flex flex-col gap-6">
        {navigation.map((group, gi) => (
          <div key={gi} className="flex flex-col gap-1">
            {group.title && !isCollapsed && (
              <p className="px-3 text-[11px] font-bold text-[var(--sidebar-muted)] mb-1 tracking-[0.05em] uppercase">
                {group.title}
              </p>
            )}
            <nav className="flex flex-col gap-0.5">
              {group.items.map((item) => {
                const isActive = currentPath === item.href || currentPath.startsWith(item.href + '/')
                return renderLink({
                  key: item.href,
                  href: item.href,
                  className: cn(
                    'flex items-center gap-3 px-3 py-2.5 rounded-lg text-sm font-medium transition-all duration-150',
                    isActive
                      ? 'bg-[var(--color-primary)] text-white font-semibold shadow-[0_4px_12px_rgba(59,130,246,0.25)]'
                      : 'text-[var(--sidebar-nav-text)] hover:bg-[var(--sidebar-hover)] hover:text-[var(--sidebar-text)]',
                    isCollapsed && 'justify-center px-2',
                  ),
                  onClick: () => handleNavigate(item.href),
                  children: (
                    <>
                      {item.icon && <span className="shrink-0 w-5 h-5">{item.icon}</span>}
                      {!isCollapsed && <span className="truncate">{item.label}</span>}
                    </>
                  ),
                } as any)
              })}
            </nav>
          </div>
        ))}
      </div>

      {/* Footer Slot */}
      {footerSlot && !isCollapsed && (
        <div className="px-4 pb-2">{footerSlot}</div>
      )}

      {/* User Profile Footer */}
      {(userName || userEmail) && (
        <div className="p-4 border-t border-[var(--sidebar-border)] bg-[var(--sidebar-bg)]">
          <div className="flex items-center gap-3 p-2.5 rounded-xl bg-[var(--sidebar-hover)]">
            <div className="w-9 h-9 rounded-full bg-[var(--sidebar-border)] text-[var(--sidebar-nav-text)] grid place-items-center shrink-0">
              <User className="w-[18px] h-[18px]" />
            </div>
            {!isCollapsed && (
              <>
                <div className="flex-1 min-w-0 flex flex-col">
                  {userName && <span className="text-[13px] font-medium text-[var(--sidebar-text)] truncate">{userName}</span>}
                  {userEmail && <span className="text-[11px] text-[var(--sidebar-muted)] truncate">{userEmail}</span>}
                </div>
                {onSignOut && (
                  <button
                    onClick={onSignOut}
                    disabled={signingOut}
                    className="shrink-0 p-2 rounded-md text-[var(--sidebar-muted)] hover:bg-[rgba(239,68,68,0.1)] hover:text-[var(--color-destructive)] transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    title="Sign out"
                  >
                    <LogOut className="w-[18px] h-[18px]" />
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      )}

      {/* Collapse toggle (desktop) */}
      {collapsible && (
        <button
          onClick={() => setIsCollapsed((v) => !v)}
          className="absolute -right-3 top-6 flex h-6 w-6 items-center justify-center rounded-full border border-[var(--color-border)] bg-[var(--color-card)] shadow-[var(--shadow-sm)] hover:bg-[var(--color-muted)] transition-colors z-10"
        >
          {isCollapsed ? <ChevronRight className="h-3 w-3" /> : <ChevronLeft className="h-3 w-3" />}
        </button>
      )}
    </div>
  )

  return (
    <div className={cn('flex h-screen overflow-hidden bg-[var(--color-background)]', className)}>
      {/* Mobile backdrop */}
      {isMobileOpen && (
        <div
          className="fixed inset-0 bg-[rgba(15,23,42,0.6)] backdrop-blur-[2px] z-40 lg:hidden"
          onClick={() => setIsMobileOpen(false)}
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex-shrink-0 bg-[var(--sidebar-bg)] text-[var(--sidebar-nav-text)] border-r border-[var(--sidebar-border)] flex flex-col transition-all duration-200 ease-in-out',
          'lg:static lg:translate-x-0',
          isMobileOpen ? 'translate-x-0 shadow-[5px_0_25px_rgba(0,0,0,0.5)]' : '-translate-x-full',
          isCollapsed ? 'w-16' : 'w-[280px]',
        )}
      >
        {sidebarContent}
      </aside>

      {/* Mobile menu button */}
      <div className="lg:hidden fixed top-0 left-0 p-4 z-40">
        <button
          onClick={() => setIsMobileOpen(!isMobileOpen)}
          className="p-2 rounded-lg bg-[var(--sidebar-bg)] text-[var(--sidebar-text)] shadow-md"
        >
          {isMobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Main content */}
      <main className="flex-1 overflow-y-auto">
        {children}
      </main>
    </div>
  )
}
