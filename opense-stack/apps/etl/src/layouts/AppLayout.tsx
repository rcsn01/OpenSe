import { useState, useEffect } from 'react'
import { Outlet, useLocation, Navigate, useNavigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, LayoutTemplate, Building2, Activity } from 'lucide-react'
import {
  AppLayout as SharedAppLayout,
  SideNav,
  SideNavItem,
  SideNavGroup,
  SideNavGroupList,
  SideNavBrandSlot,
  SideNavUserProfile,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { OrgSimple, useUserOrganisations } from '../hooks/queries/useOrganisations'

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/gallery', label: 'Gallery', icon: <LayoutTemplate className="w-5 h-5" /> },
  { href: '/organisation', label: 'Organisation', icon: <Building2 className="w-5 h-5" /> },
  { href: '/activity', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const { session, user, loading, isDemoUser, logout } = useAuth()
  const navigate = useNavigate()
  const [signingOut, setSigningOut] = useState(false)
  const location = useLocation()

  const [currentOrg, setCurrentOrg] = useState<OrgSimple | null>(null)
  const { data: userOrgs = [] } = useUserOrganisations(user?.id)

  useEffect(() => {
    if (userOrgs.length > 0 && !currentOrg) {
      setCurrentOrg(userOrgs[0])
    } else if (userOrgs.length > 0 && currentOrg) {
      const exists = userOrgs.find((o) => o.id === currentOrg.id)
      if (!exists) setCurrentOrg(userOrgs[0])
    } else if (userOrgs.length === 0 && currentOrg) {
      setCurrentOrg(null)
    }
  }, [userOrgs, currentOrg])

  const handleSignOut = async () => {
    try {
      setSigningOut(true)
      await logout()
      navigate('/login', { replace: true })
    } finally {
      setSigningOut(false)
    }
  }

  if (!session && !isDemoUser && !loading) {
    return <Navigate to="/login" replace />
  }

  const sidebar = (
    <>
      <SideNavBrandSlot icon="OE" name="Open ETL" version="v1.0" />
      <SideNav>
        <SideNavGroupList>
          <SideNavGroup category="main">
            {mainNavItems.map((item) => {
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
            })}
          </SideNavGroup>
        </SideNavGroupList>
      </SideNav>
      <SideNavUserProfile
        userName={user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
        userEmail={user?.email || 'user@example.com'}
        onLogout={handleSignOut}
        signingOut={signingOut}
      />
    </>
  )

  return (
    <SharedAppLayout
      sidebar={sidebar}
      profileFallback={user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
    >
      <Outlet context={{ currentOrg }} />
    </SharedAppLayout>
  )
}
