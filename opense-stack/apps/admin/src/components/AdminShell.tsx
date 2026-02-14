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
import { Boxes, Building2, LayoutDashboard, ShieldCheck } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'

const navItems = [
  { to: '/platform', label: 'Platform', icon: LayoutDashboard },
  { to: '/etl-admin', label: 'ETL Admin', icon: Building2 },
  { to: '/stoqr', label: 'StoQR Admin', icon: Boxes },
]

export const AdminShell = () => {
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
          <SideNavUserProfile
            userName={user?.user_metadata?.full_name ?? user?.email ?? 'Super Admin'}
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
