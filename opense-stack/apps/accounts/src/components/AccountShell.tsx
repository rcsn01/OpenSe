import { useState } from 'react'
import { NavLink, Outlet, useLocation } from 'react-router-dom'
import {
  AppLayout,
  SideNav,
  SideNavBrandSlot,
  SideNavGroup,
  SideNavGroupList,
  SideNavItem,
  SideNavUserProfile,
} from '@repo/ui'
import { Building2, CreditCard, ShieldCheck, Users } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'

const navItems = [
  { to: '/account/settings', label: 'Organisation', icon: Building2 },
  { to: '/account/billing', label: 'Billing & Limits', icon: CreditCard },
  { to: '/account/seats', label: 'Seat Assignments', icon: Users },
]

export const AccountShell = () => {
  const location = useLocation()
  const { logout, user } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleLogout = async () => {
    setSigningOut(true)
    try {
      await logout()
    } finally {
      setSigningOut(false)
    }
  }

  return (
    <AppLayout
      sidebar={
        <>
          <SideNavBrandSlot icon={<ShieldCheck />} name="OpenSe Accounts" version="v1" />
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
          <SideNavUserProfile
            userName={user?.user_metadata?.full_name ?? user?.email ?? 'User'}
            userEmail={user?.email}
            onLogout={() => {
              void handleLogout()
            }}
            signingOut={signingOut}
          />
        </>
      }
    >
      <Outlet />
    </AppLayout>
  )
}
