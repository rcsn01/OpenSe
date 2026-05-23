import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, Navigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, LayoutTemplate, Building2, Activity } from 'lucide-react'
import {
  AppShellLayout,
  type AppShellNavItem,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { OrgSimple, useUserOrganisations } from '../hooks/queries/useOrganisations'
import {
  TopBarSearchContent,
  TopBarSearchProvider,
} from '../components/Search/TopBarSearch'
import {
  buildAccountsOnboardingUrl,
  buildAccountsSettingsUrl,
} from '../lib/authRedirect'

const mainNavItems: AppShellNavItem[] = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/gallery', label: 'Workflow Gallery', icon: <LayoutTemplate className="w-5 h-5" /> },
  { href: '/organisation', label: 'Organisation', icon: <Building2 className="w-5 h-5" /> },
  { href: '/activity', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const { session, user, loading, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const location = useLocation()
  const [pendingRedirect, setPendingRedirect] = useState(false)
  const [orgRedirecting, setOrgRedirecting] = useState(false)
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [currentOrg, setCurrentOrg] = useState<OrgSimple | null>(null)
  const {
    data: userOrgs = [],
    isLoading: orgsLoading,
    isError: orgsError,
  } = useUserOrganisations(user?.id)

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

  useEffect(() => {
    if (!session || !user || orgsLoading || orgsError || userOrgs.length > 0) {
      setOrgRedirecting(false)
      return
    }

    setOrgRedirecting(true)
    window.location.assign(
      buildAccountsOnboardingUrl(
        `${location.pathname}${location.search}${location.hash}`,
      ),
    )
  }, [location.hash, location.pathname, location.search, orgsError, orgsLoading, session, user, userOrgs.length])

  const shouldRedirectToOnboarding =
    Boolean(session && user) && !orgsLoading && !orgsError && userOrgs.length === 0

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
    if (signingOut || session || loading) {
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
  }, [signingOut, session, loading])

  if (!session && !loading) {
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

  if (shouldRedirectToOnboarding || orgRedirecting) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-100">
        <div className="animate-pulse text-slate-500">Redirecting to Accounts...</div>
      </div>
    )
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
          window.location.assign(buildAccountsSettingsUrl())
        }}
        onLogout={handleSignOut}
        searchContent={<TopBarSearchContent />}
      >
        <Outlet context={{ currentOrg }} />
      </AppShellLayout>
    </TopBarSearchProvider>
  )
}
