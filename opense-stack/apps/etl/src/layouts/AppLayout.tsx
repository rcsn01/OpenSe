import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, Navigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, LayoutTemplate, Building2, Activity } from 'lucide-react'
import {
  AppShellLayout,
  type AppShellNavItem,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { buildAccountsSettingsUrl } from '@repo/shared/utils'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'
import { OrgSimple, useUserOrganisations } from '../hooks/queries/useOrganisations'
import {
  TopBarSearchContent,
  TopBarSearchProvider,
} from '../components/Search/TopBarSearch'

const mainNavItems: AppShellNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/gallery', label: 'Workflow Gallery', icon: <LayoutTemplate className="w-5 h-5" /> },
  { href: '/organisation', label: 'Organisation', icon: <Building2 className="w-5 h-5" /> },
  { href: '/activity', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const { session, user, loading, isDemoUser, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const location = useLocation()
  const [pendingRedirect, setPendingRedirect] = useState(false)
  const accountsUrl =
    getRuntimeConfigValue('VITE_ACCOUNTS_URL', 'https://accounts.rcsn01.com') ??
    'https://accounts.rcsn01.com'
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    setSigningOut(true)
    try {
      await logout()
    } catch (err) {
      console.error('Sign out error:', err)
    }
    // Full navigation avoids the React Router race where AppLayout's
    // unauthenticated redirect (<Navigate to="/login">) fires before the
    // router processes navigate('/'), causing an accounts ↔ dashboard loop.
    window.location.replace('/')
  }

  // Delay redirect to allow session to restore from shared cookie (avoids flash loop with accounts login)
  // Skip redirect entirely when signing out - handleSignOut will navigate to landing
  useEffect(() => {
    if (signingOut || session || isDemoUser || loading) {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }
      setPendingRedirect(false)
      return
    }
    if (!redirectTimeout.current) {
      redirectTimeout.current = setTimeout(() => {
        redirectTimeout.current = null
        setPendingRedirect(true)
      }, 250)
    }
    return () => {
      if (redirectTimeout.current) {
        clearTimeout(redirectTimeout.current)
        redirectTimeout.current = null
      }
    }
  }, [signingOut, session, isDemoUser, loading])

  if (!session && !isDemoUser && !loading) {
    // Don't redirect when signing out - let handleSignOut navigate to landing
    if (signingOut) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="animate-pulse text-slate-500">Signing out...</div>
        </div>
      )
    }
    if (!pendingRedirect) {
      return (
        <div className="min-h-screen flex items-center justify-center bg-slate-100">
          <div className="animate-pulse text-slate-500">Loading...</div>
        </div>
      )
    }
    return <Navigate to="/login" replace />
  }

  return (
    <TopBarSearchProvider>
      <AppShellLayout
        brand={{ icon: 'OE', name: 'Open ETL', version: 'v1.0' }}
        navGroups={[{ category: 'main', items: mainNavItems }]}
        currentPath={location.pathname}
        renderNavLink={(item, { className, children }) => (
          <NavLink to={item.href} className={className}>
            {children}
          </NavLink>
        )}
        profileFallback={user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
        onSettingsClick={() => {
          window.location.assign(buildAccountsSettingsUrl({ accountsUrl }))
        }}
        onLogout={handleSignOut}
        searchContent={<TopBarSearchContent />}
      >
        <Outlet context={{ currentOrg }} />
      </AppShellLayout>
    </TopBarSearchProvider>
  )
}
