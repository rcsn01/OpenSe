import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import { useCurrentAccountProfileSummary } from '@repo/shared/account-profile'
import { supabase } from '@repo/shared/supabase'
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
  SWITCHABLE_APP_ICONS,
  type AppShellNavItem,
} from '@repo/ui'
import {
  TopBarSearchContent,
  TopBarSearchProvider,
} from '../components/Search/TopBarSearch'
import { useCompany } from '../contexts/CompanyContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { buildAccountsProfileUrl, buildAccountsSettingsUrl } from '../lib/authRedirect'

const StoqrBrandIcon = SWITCHABLE_APP_ICONS.stoqr

const isSectionActive = (sectionRoot: string) => (pathname: string) =>
  pathname === sectionRoot || pathname.startsWith(`${sectionRoot}/`)

const mainNavItems: Array<AppShellNavItem & { permission: string }> = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" />, permission: 'dashboard.view' },
  { href: '/inventory/all', label: 'Inventory', icon: <Package className="w-5 h-5" />, permission: 'inventory.view', isActive: isSectionActive('/inventory') },
  { href: '/scan/scan-actions', label: 'Scanner', icon: <ScanBarcode className="w-5 h-5" />, permission: 'scanner.view', isActive: isSectionActive('/scan') },
  { href: '/tools/labels/templates', label: 'Label Studio', icon: <Tags className="w-5 h-5" />, permission: 'labels.view', isActive: isSectionActive('/tools/labels') },
  { href: '/reports/stock-health', label: 'Reports', icon: <FileText className="w-5 h-5" />, permission: 'reports.view', isActive: isSectionActive('/reports') },
  { href: '/procurement/purchase-orders', label: 'Procurement', icon: <Truck className="w-5 h-5" />, permission: 'procurement.view', isActive: isSectionActive('/procurement') },
]

const configNavItems: Array<AppShellNavItem & { permission: string }> = [
  { href: '/alerts/feed', label: 'Alerts', icon: <Bell className="w-5 h-5" />, permission: 'alerts.view', isActive: isSectionActive('/alerts') },
  { href: '/settings/organisations/teams', label: 'Organisations', icon: <Settings className="w-5 h-5" />, permission: 'organisation.view', isActive: isSectionActive('/settings/organisations') },
]

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const accountProfile = useCurrentAccountProfileSummary({ user, client: supabase })
  const { companyId } = useCompany()
  const { data: permissions = [], isLoading: permissionsLoading } = useMyPermissions(companyId)

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  const filterByPermission = (items: Array<AppShellNavItem & { permission: string }>): AppShellNavItem[] =>
    items
      .filter((item) => permissionsLoading || permissions.includes(item.permission))
      .map((item) => ({ href: item.href, label: item.label, icon: item.icon, isActive: item.isActive }))

  return (
    <TopBarSearchProvider>
      <AppShellLayout
        brand={{ icon: <StoqrBrandIcon className="w-5 h-5" />, name: 'Open StoQR', version: 'v1.0' }}
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
        profileSrc={accountProfile.profileSrc}
        profileFallback={accountProfile.profileFallback}
        onProfileClick={() => {
          window.location.assign(buildAccountsProfileUrl())
        }}
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
