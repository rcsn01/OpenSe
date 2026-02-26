import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import { buildAccountsSettingsUrl } from '@repo/shared/utils'
import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Tags,
  FileText,
  Truck,
  Bell,
  Settings,
} from 'lucide-react'
import {
  AppLayout as SharedAppLayout,
  SideNav,
  SideNavItem,
  SideNavGroup,
  SideNavGroupList,
  SideNavBrandSlot,
} from '@repo/ui'

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/inventory', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
  { href: '/scan', label: 'Scanner', icon: <ScanBarcode className="w-5 h-5" /> },
  { href: '/tools/labels', label: 'Label Studio', icon: <Tags className="w-5 h-5" /> },
  { href: '/reports', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { href: '/procurement', label: 'Procurement', icon: <Truck className="w-5 h-5" /> },
]

const configNavItems = [
  { href: '/alerts', label: 'Alerts', icon: <Bell className="w-5 h-5" /> },
  { href: '/settings/team', label: 'Team Settings', icon: <Settings className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [search, setSearch] = useState('')
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })
  const accountsUrl =
    (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? 'https://accounts.rcsn01.com'

  useEffect(() => {
    setUserName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User')
  }, [user])

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const applyViewport = () => {
      const isMobile = mediaQuery.matches || window.innerWidth <= 767
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
  }, [])

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  const renderNavItem = (item: (typeof mainNavItems)[0]) => {
    const isActive =
      location.pathname === item.href || location.pathname.startsWith(item.href + '/')
    return (
      <SideNavItem
        key={item.href}
        active={isActive}
        renderLink={({ className, children }) => (
          <NavLink to={item.href} className={className}>
            {children}
          </NavLink>
        )}
      >
        {item.icon}
        {item.label}
      </SideNavItem>
    )
  }

  const sidebar = (
    <>
      <SideNavBrandSlot icon="OS" name="Open StoQR" version="v1.0" />
      <SideNav>
        <SideNavGroupList>
          <SideNavGroup category="main">{mainNavItems.map(renderNavItem)}</SideNavGroup>
          <SideNavGroup category="configuration">{configNavItems.map(renderNavItem)}</SideNavGroup>
        </SideNavGroupList>
      </SideNav>
    </>
  )

  return (
    <SharedAppLayout
      sidebar={sidebar}
      profileFallback={userName?.[0] || 'U'}
      onSettingsClick={() => {
        window.location.assign(buildAccountsSettingsUrl({ accountsUrl }))
      }}
      onLogout={handleSignOut}
      searchPlaceholder="Search items..."
      searchValue={search}
      onSearchChange={setSearch}
      mobileSidebar={{
        enabled: isMobileViewport,
        isOpen: isMobileNavOpen,
        onOpen: () => setIsMobileNavOpen(true),
        onClose: () => setIsMobileNavOpen(false),
        toggleAriaLabel: 'Toggle side navigation',
      }}
    >
      <Outlet />
    </SharedAppLayout>
  )
}
