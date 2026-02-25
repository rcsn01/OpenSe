import { useEffect, useState } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppLayout,
  Button,
  SideNav,
  SideNavBrandSlot,
  SideNavGroup,
  SideNavGroupList,
  SideNavItem,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { Building2, ChevronLeft, ChevronRight, CreditCard, Settings, ShieldCheck, SlidersHorizontal, Users } from 'lucide-react'
import {
  accountNavigationItems,
  detectAccountsMobileViewport,
  getAccountsLayoutMobileStateClass,
  getAccountsLayoutViewportClass,
  isAccountNavItemActive,
} from './accountNavigation'

const navIconsByPath = {
  '/general': SlidersHorizontal,
  '/settings': Settings,
  '/organisation': Building2,
  '/billing': CreditCard,
  '/seats': Users,
} as const

export const AccountShell = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()
  const [search, setSearch] = useState('')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return detectAccountsMobileViewport(
      window.matchMedia('(max-width: 767px)').matches,
      window.innerWidth,
      window.screen?.width,
      window.visualViewport?.width,
    )
  })

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const applyViewport = () => {
      const isMobile = detectAccountsMobileViewport(
        mediaQuery.matches,
        window.innerWidth,
        window.screen?.width,
        window.visualViewport?.width,
      )

      setIsMobileViewport(isMobile)
      if (!isMobile) {
        setIsMobileNavOpen(false)
      }
    }

    applyViewport()

    const onChange = () => {
      applyViewport()
    }

    mediaQuery.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)
    window.visualViewport?.addEventListener('resize', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
      window.visualViewport?.removeEventListener('resize', onChange)
    }
  }, [])

  const layoutClassName = `accounts-layout ${getAccountsLayoutViewportClass(isMobileViewport)} ${getAccountsLayoutMobileStateClass(isMobileNavOpen)}`

  return (
    <>
      {isMobileViewport && !isMobileNavOpen ? (
        <Button
          variant="outline"
          size="icon"
          className="fixed left-2 top-16 z-[60]"
          aria-label="Open side navigation"
          onClick={() => setIsMobileNavOpen(true)}
        >
          <ChevronRight className="h-4 w-4" />
        </Button>
      ) : null}

      <AppLayout
        className={layoutClassName}
        onSettingsClick={() => navigate('/settings')}
        onLogout={() => void logout()}
        searchPlaceholder="Search items..."
        searchValue={search}
        onSearchChange={setSearch}
        sidebar={
          <>
            <SideNavBrandSlot
              icon={<ShieldCheck />}
              name="OpenSe Accounts"
              version="v1"
              trailing={
                <Button
                  variant="ghost"
                  size="icon"
                  className={isMobileViewport ? '' : 'hidden'}
                  aria-label="Close side navigation"
                  onClick={() => setIsMobileNavOpen(false)}
                >
                  <ChevronLeft className="h-4 w-4" />
                </Button>
              }
            />
            <SideNav>
              <SideNavGroupList>
                <SideNavGroup category="main">
                  {accountNavigationItems.map(({ to, label }) => {
                    const Icon = navIconsByPath[to as keyof typeof navIconsByPath]
                    const isActive = isAccountNavItemActive(location.pathname, to)
                    return (
                      <SideNavItem
                        key={to}
                        active={isActive}
                        renderLink={({ className, children }) => (
                          <NavLink to={to} className={className}>
                            {children}
                          </NavLink>
                        )}
                      >
                        <Icon className="h-4 w-4" />
                        <span>{label}</span>
                      </SideNavItem>
                    )
                  })}
                </SideNavGroup>
              </SideNavGroupList>
            </SideNav>
          </>
        }
      >
        <Outlet />
      </AppLayout>
    </>
  )
}
