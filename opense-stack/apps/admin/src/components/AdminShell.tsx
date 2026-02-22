import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AppLayout,
  SideNav,
  SideNavBrandSlot,
  SideNavGroup,
  SideNavGroupList,
  SideNavItem,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { buildAccountsSettingsUrl } from '@repo/shared/utils'
import { Building2, LayoutDashboard, ShieldCheck, Settings2, Wallet, UserCog } from 'lucide-react'

const navItems = [
  { to: '/platform', label: 'Global Overview', icon: LayoutDashboard },
  { to: '/organisations', label: 'Organizations List', icon: Building2 },
  { to: '/applications', label: 'Application Mgmt', icon: Settings2 },
  { to: '/financials', label: 'Financials', icon: Wallet },
  { to: '/platform-admin', label: 'Platform Admin', icon: UserCog },
]

export const AdminShell = () => {
  const location = useLocation()
  const { logout } = useAuth()
  const accountsUrl =
    (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? 'https://accounts.rcsn01.com'

  return (
    <AppLayout
      onSettingsClick={() => {
        window.location.assign(buildAccountsSettingsUrl({ accountsUrl }))
      }}
      onLogout={() => void logout()}
      sidebar={
        <>
          <SideNavBrandSlot icon={<ShieldCheck />} name="OpenSe Admin" version="v1" />
          <SideNav>
            <SideNavGroupList>
              <SideNavGroup category="main">
                {navItems.map(({ to, label, icon: Icon }) => {
                  const isActive = location.pathname === to || location.pathname.startsWith(`${to}/`)
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
  )
}
