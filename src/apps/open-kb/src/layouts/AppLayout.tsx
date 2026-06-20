import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { useAuth } from '@repo/shared/auth/context'
import { useCurrentAccountProfileSummary } from '@repo/shared/account-profile'
import { supabase } from '@repo/shared/supabase'
import {
  Archive,
  BarChart3,
  Bell,
  ClipboardList,
  FilePenLine,
  GitPullRequestArrow,
  Inbox,
  LayoutDashboard,
  PanelsTopLeft,
  Ruler,
  Settings,
  Sparkles,
  StickyNote,
  UsersRound,
} from 'lucide-react'
import {
  AppShellLayout,
  SWITCHABLE_APP_ICONS,
  type AppShellNavItem,
} from '@repo/ui'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'
import { buildAccountsProfileUrl, buildAccountsSettingsUrl } from '../lib/authRedirect'
import { OrganisationSwitcher } from '../components/OrganisationSwitcher'

const OpenKbBrandIcon = SWITCHABLE_APP_ICONS['open-kb']

const isSectionActive = (sectionRoot: string) => (pathname: string) =>
  pathname === sectionRoot || pathname.startsWith(`${sectionRoot}/`)

const mainNavItems: Array<AppShellNavItem & { permission: string }> = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="h-5 w-5" />, permission: 'dashboard.view' },
  { href: '/projects', label: 'Projects', icon: <PanelsTopLeft className="h-5 w-5" />, permission: 'projects.view', isActive: isSectionActive('/projects') },
  { href: '/teams', label: 'Teams', icon: <UsersRound className="h-5 w-5" />, permission: 'projects.view', isActive: isSectionActive('/teams') },
  { href: '/issues', label: 'Issues', icon: <ClipboardList className="h-5 w-5" />, permission: 'issues.view', isActive: isSectionActive('/issues') },
  { href: '/drafts', label: 'Drafts', icon: <FilePenLine className="h-5 w-5" />, permission: 'issues.create', isActive: isSectionActive('/drafts') },
  { href: '/cycles', label: 'Cycles', icon: <GitPullRequestArrow className="h-5 w-5" />, permission: 'planning.view', isActive: isSectionActive('/cycles') },
  { href: '/modules', label: 'Modules', icon: <Archive className="h-5 w-5" />, permission: 'planning.view', isActive: isSectionActive('/modules') },
  { href: '/estimates', label: 'Estimates', icon: <Ruler className="h-5 w-5" />, permission: 'planning.view', isActive: isSectionActive('/estimates') },
  { href: '/pages', label: 'Pages', icon: <Sparkles className="h-5 w-5" />, permission: 'pages.view', isActive: isSectionActive('/pages') },
  { href: '/stickies', label: 'Stickies', icon: <StickyNote className="h-5 w-5" />, permission: 'pages.view', isActive: isSectionActive('/stickies') },
]

const configNavItems: Array<AppShellNavItem & { permission: string }> = [
  { href: '/notifications', label: 'Notifications', icon: <Bell className="h-5 w-5" />, permission: 'dashboard.view', isActive: isSectionActive('/notifications') },
  { href: '/intake', label: 'Intake', icon: <Inbox className="h-5 w-5" />, permission: 'intake.view', isActive: isSectionActive('/intake') },
  { href: '/analytics', label: 'Analytics', icon: <BarChart3 className="h-5 w-5" />, permission: 'analytics.view', isActive: isSectionActive('/analytics') },
  { href: '/settings', label: 'Settings', icon: <Settings className="h-5 w-5" />, permission: 'settings.view', isActive: isSectionActive('/settings') },
]

export const AppLayout = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const accountProfile = useCurrentAccountProfileSummary({ user, client: supabase })
  const { organisationId } = useOrganisation()
  const { data: permissions = [], isLoading: permissionsLoading } = useMyPermissions(organisationId)

  const handleSignOut = async () => {
    await logout()
    navigate('/')
  }

  const filterByPermission = (items: Array<AppShellNavItem & { permission: string }>): AppShellNavItem[] =>
    items
      .filter((item) => permissionsLoading || permissions.includes(item.permission))
      .map((item) => ({ href: item.href, label: item.label, icon: item.icon, isActive: item.isActive }))

  return (
    <AppShellLayout
      brand={{
        icon: <OpenKbBrandIcon className="h-5 w-5" />,
        name: 'Open-KB',
        version: 'v0.1',
        trailing: <OrganisationSwitcher />,
      }}
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
      onProfileClick={() => window.location.assign(buildAccountsProfileUrl())}
      onSettingsClick={() => window.location.assign(buildAccountsSettingsUrl())}
      onLogout={handleSignOut}
    >
      <Outlet />
    </AppShellLayout>
  )
}
