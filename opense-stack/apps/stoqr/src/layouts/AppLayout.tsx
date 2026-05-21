import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import { buildAccountsSettingsUrl } from '@repo/shared/utils'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'
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
  AppShellLayout,
  type AppShellNavItem,
} from '@repo/ui'
import {
  TopBarSearchContent,
  TopBarSearchProvider,
} from '../components/Search/TopBarSearch'

const mainNavItems: AppShellNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/inventory/all', label: 'Inventory', icon: <Package className="w-5 h-5" /> },
  { href: '/scan/scan-actions', label: 'Scanner', icon: <ScanBarcode className="w-5 h-5" /> },
  { href: '/tools/labels/templates', label: 'Label Studio', icon: <Tags className="w-5 h-5" /> },
  { href: '/reports/stock-health', label: 'Reports', icon: <FileText className="w-5 h-5" /> },
  { href: '/procurement/purchase-orders', label: 'Procurement', icon: <Truck className="w-5 h-5" /> },
]

const configNavItems: AppShellNavItem[] = [
  { href: '/alerts/feed', label: 'Alerts', icon: <Bell className="w-5 h-5" /> },
  { href: '/settings/organisations/teams', label: 'Organisations', icon: <Settings className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'
  const accountsUrl =
    getRuntimeConfigValue('VITE_ACCOUNTS_URL', 'https://accounts.rcsn01.com') ??
    'https://accounts.rcsn01.com'

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  return (
    <TopBarSearchProvider>
      <AppShellLayout
        brand={{ icon: 'OS', name: 'Open StoQR', version: 'v1.0' }}
        navGroups={[
          { category: 'main', items: mainNavItems },
          { category: 'configuration', items: configNavItems },
        ]}
        currentPath={location.pathname}
        renderNavLink={(item, { className, children }) => (
          <NavLink to={item.href} className={className}>
            {children}
          </NavLink>
        )}
        profileFallback={userName?.[0] || 'U'}
        onSettingsClick={() => {
          window.location.assign(buildAccountsSettingsUrl({ accountsUrl }))
        }}
        onLogout={handleSignOut}
        searchContent={<TopBarSearchContent />}
      >
        <Outlet />
      </AppShellLayout>
    </TopBarSearchProvider>
  )
}
