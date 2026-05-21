import { NavLink, Outlet, useLocation, useNavigate } from 'react-router-dom'
import {
  AppShellLayout,
  type AppShellNavItem,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { Activity, Building2, CreditCard, ShieldCheck, SlidersHorizontal, UserRound, Users } from 'lucide-react'
import {
  accountNavigationItems,
} from './accountNavigation'

const navIconsByPath = {
  '/account/profile': UserRound,
  '/account/security': ShieldCheck,
  '/account/organisation': Building2,
  '/account/billing': CreditCard,
  '/account/seats': Users,
  '/account/activity': Activity,
  '/account/preferences': SlidersHorizontal,
} as const

export const AccountShell = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { logout } = useAuth()

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
      onSettingsClick={() => navigate('/account/preferences')}
      onLogout={() => void logout()}
    >
      <Outlet />
    </AppShellLayout>
  )
}
