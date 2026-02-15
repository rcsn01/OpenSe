import { useState, useEffect } from 'react'
import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import {
  LayoutDashboard,
  Package,
  ScanBarcode,
  Tags,
  FileText,
  Truck,
  Bell,
  Settings,
  Database,
} from 'lucide-react'
import {
  AppLayout as SharedAppLayout,
  SideNav,
  SideNavItem,
  SideNavGroup,
  SideNavGroupList,
  SideNavBrandSlot,
  SideNavUserProfile,
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
  { href: '/settings/attributes', label: 'Attributes', icon: <Database className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const [userName, setUserName] = useState<string>('')
  const [userEmail, setUserEmail] = useState<string>('')
  const [signingOut, setSigningOut] = useState(false)

  useEffect(() => {
    setUserName(user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User')
    setUserEmail(user?.email || '')
  }, [user])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await logout()
      navigate('/')
    } finally {
      setSigningOut(false)
    }
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
      <SideNavUserProfile
        userName={userName}
        userEmail={userEmail}
        onLogout={handleSignOut}
        signingOut={signingOut}
      />
    </>
  )

  return (
    <SharedAppLayout
      sidebar={sidebar}
      profileFallback={userName?.[0] || 'U'}
      onLogout={handleSignOut}
    >
      <Outlet />
    </SharedAppLayout>
  )
}
