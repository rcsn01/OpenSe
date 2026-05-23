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
} from 'lucide-react'
import {
  AppShellLayout,
  type AppShellNavItem,
} from '@repo/ui'
import {
  TopBarSearchContent,
  TopBarSearchProvider,
} from '../components/Search/TopBarSearch'
import { useCompany } from '../contexts/CompanyContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { buildAccountsSettingsUrl } from '../lib/authRedirect'

const mainNavItems: Array<AppShellNavItem & { permission: string }> = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, permission: 'dashboard.view' },
  { href: '/inventory/all', label: 'Inventory', icon: <Package className="w-5 h-5" />, permission: 'inventory.view' },
  { href: '/scan/scan-actions', label: 'Scanner', icon: <ScanBarcode className="w-5 h-5" />, permission: 'scanner.view' },
  { href: '/tools/labels/templates', label: 'Label Studio', icon: <Tags className="w-5 h-5" />, permission: 'labels.view' },
  { href: '/reports/stock-health', label: 'Reports', icon: <FileText className="w-5 h-5" />, permission: 'reports.view' },
  { href: '/procurement/purchase-orders', label: 'Procurement', icon: <Truck className="w-5 h-5" />, permission: 'procurement.view' },
]

const configNavItems: Array<AppShellNavItem & { permission: string }> = [
  { href: '/alerts/feed', label: 'Alerts', icon: <Bell className="w-5 h-5" />, permission: 'alerts.view' },
  { href: '/settings/organisations/teams', label: 'Organisations', icon: <Settings className="w-5 h-5" />, permission: 'organisation.view' },
]

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const { companyId } = useCompany()
  const { data: permissions = [], isLoading: permissionsLoading } = useMyPermissions(companyId)
  const userName = user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  const filterByPermission = (items: Array<AppShellNavItem & { permission: string }>): AppShellNavItem[] =>
    items
      .filter((item) => permissionsLoading || permissions.includes(item.permission))
      .map((item) => ({ href: item.href, label: item.label, icon: item.icon }))

  return (
    <TopBarSearchProvider>
      <AppShellLayout
        brand={{ icon: 'OS', name: 'Open StoQR', version: 'v1.0' }}
        navGroups={[
          { category: 'main', items: filterByPermission(mainNavItems) },
          { category: 'configuration', items: filterByPermission(configNavItems) },
        ]}
        currentPath={location.pathname}
        renderNavLink={(item, { className, children }) => (
          <NavLink to={item.href} className={className}>
            {children}
          </NavLink>
        )}
        profileFallback={userName?.[0] || 'U'}
        onSettingsClick={() => {
          window.location.assign(buildAccountsSettingsUrl())
        }}
        onLogout={handleSignOut}
        searchContent={<TopBarSearchContent />}
      >
        <Outlet />
      </AppShellLayout>
    </TopBarSearchProvider>
  )
}
