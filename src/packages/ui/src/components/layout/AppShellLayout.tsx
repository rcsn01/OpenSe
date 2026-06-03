import { type ReactNode, useEffect, useState } from 'react'
import {
  AppLayout,
  type AppLayoutProps,
} from './AppLayout'
import {
  SideNav,
  SideNavBrandSlot,
  SideNavGroup,
  SideNavGroupList,
  SideNavItem,
  type SideNavCategory,
} from '../ui/SideNav'

export interface AppShellNavItem {
  href: string
  label: string
  icon: ReactNode
  ariaLabel?: string
  trailing?: ReactNode
  children?: ReactNode
  isActive?: (pathname: string, href: string) => boolean
}

export interface AppShellNavGroup {
  category?: SideNavCategory
  title?: string
  trailing?: ReactNode
  items: AppShellNavItem[]
}

export interface AppShellLayoutProps
  extends Omit<AppLayoutProps, 'sidebar' | 'children' | 'mobileSidebar'> {
  brand: {
    icon: ReactNode
    name: string
    version?: string
    trailing?: ReactNode
  }
  navGroups: AppShellNavGroup[]
  currentPath: string
  renderNavLink: (
    item: AppShellNavItem,
    props: { className: string; children: ReactNode; onClick?: () => void },
  ) => ReactNode
  children: ReactNode
  mobileBreakpoint?: number
  mobileToggleAriaLabel?: string
}

const defaultIsActive = (pathname: string, href: string) => {
  return pathname === href || pathname.startsWith(`${href}/`)
}

export function AppShellLayout({
  brand,
  navGroups,
  currentPath,
  renderNavLink,
  children,
  mobileBreakpoint = 767,
  mobileToggleAriaLabel = 'Toggle side navigation',
  ...appLayoutProps
}: AppShellLayoutProps) {
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia(`(max-width: ${mobileBreakpoint}px)`).matches
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia(`(max-width: ${mobileBreakpoint}px)`)
    const applyViewport = () => {
      const isMobile = mediaQuery.matches || window.innerWidth <= mobileBreakpoint
      setIsMobileViewport(isMobile)
      if (!isMobile) {
        setIsMobileNavOpen(false)
      }
    }

    applyViewport()

    const onChange = () => applyViewport()
    mediaQuery.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [mobileBreakpoint])

  const renderNavItem = (item: AppShellNavItem) => {
    const isActive = item.isActive
      ? item.isActive(currentPath, item.href)
      : defaultIsActive(currentPath, item.href)

    return (
      <div key={item.href} className="group/item relative">
        <SideNavItem
          active={isActive}
          renderLink={(props) => renderNavLink(item, props)}
        >
          {item.icon}
          <span className="min-w-0 flex-1 truncate">{item.label}</span>
        </SideNavItem>
        {item.trailing ? (
          <div className="absolute right-1 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/item:opacity-100 focus-within:opacity-100">
            {item.trailing}
          </div>
        ) : null}
        {item.children}
      </div>
    )
  }

  const sidebar = (
    <>
      <SideNavBrandSlot
        icon={brand.icon}
        name={brand.name}
        version={brand.version}
        trailing={brand.trailing}
      />
      <SideNav>
        <SideNavGroupList>
          {navGroups.map((group) => (
            <SideNavGroup
              key={group.title ?? group.category ?? group.items.map((item) => item.href).join(':')}
              category={group.category}
              title={group.title}
              trailing={group.trailing}
            >
              {group.items.map(renderNavItem)}
            </SideNavGroup>
          ))}
        </SideNavGroupList>
      </SideNav>
    </>
  )

  return (
    <AppLayout
      {...appLayoutProps}
      sidebar={sidebar}
      mobileSidebar={{
        enabled: isMobileViewport,
        isOpen: isMobileNavOpen,
        onOpen: () => setIsMobileNavOpen(true),
        onClose: () => setIsMobileNavOpen(false),
        toggleAriaLabel: mobileToggleAriaLabel,
      }}
    >
      {children}
    </AppLayout>
  )
}
