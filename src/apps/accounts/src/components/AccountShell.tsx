import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShellLayout,
  type AppShellNavItem,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { useCurrentAccountProfileSummary } from '@repo/shared/account-profile'
import { supabase } from '@repo/shared/supabase'
import { Activity, Building2, CreditCard, Home, Settings, ShieldCheck, UserRound, Users } from 'lucide-react'
import {
  accountNavigationItems,
} from './accountNavigation'

const navIconsByPath = {
  '/account/home': Home,
  '/account/profile': UserRound,
  '/account/security': ShieldCheck,
  '/account/organisation': Building2,
  '/account/billing': CreditCard,
  '/account/seats': Users,
  '/account/activity': Activity,
  '/account/settings': Settings,
} as const

export const AccountShell = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout } = useAuth()
  const accountProfile = useCurrentAccountProfileSummary({ user, client: supabase })

  const navItems: AppShellNavItem[] = accountNavigationItems.map(({ to, label }) => {
    const Icon = navIconsByPath[to as keyof typeof navIconsByPath]
    return {
      href: to,
      label,
      icon: <Icon className="h-4 w-4" />,
    }
  })

  return (
    <AppShellLayout
      brand={{ icon: <ShieldCheck />, name: 'OpenSe Accounts', version: 'v1' }}
      navGroups={[{ category: 'main', items: navItems }]}
      currentPath={location.pathname}
      renderNavLink={(item, { className, children }) => (
        <NavLink to={item.href} className={className}>
          {children}
        </NavLink>
      )}
      profileSrc={accountProfile.profileSrc}
      profileFallback={accountProfile.profileFallback}
      onProfileClick={() => navigate('/account/profile')}
      onSettingsClick={() => navigate('/account/settings')}
      onLogout={() => void logout()}
    >
      <Outlet />
    </AppShellLayout>
  )
}
