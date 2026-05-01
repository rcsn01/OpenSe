import { useState, useEffect, useRef } from 'react'
import { Outlet, useLocation, Navigate, NavLink } from 'react-router-dom'
import { LayoutDashboard, LayoutTemplate, Building2, Activity, Search, ScrollText } from 'lucide-react'
import {
  AppLayout as SharedAppLayout,
  SideNav,
  SideNavItem,
  SideNavGroup,
  SideNavGroupList,
  SideNavBrandSlot,
  SwitchAppTopBar,
  Input,
} from '@repo/ui'
import { useAuth } from '@repo/shared/auth/context'
import { buildAccountsSettingsUrl } from '@repo/shared/utils'
import { OrgSimple, useUserOrganisations } from '../hooks/queries/useOrganisations'

const mainNavItems = [
  { href: '/dashboard', label: 'Dashboard', icon: <LayoutDashboard className="w-5 h-5" /> },
  { href: '/gallery', label: 'Workflow Gallery', icon: <LayoutTemplate className="w-5 h-5" /> },
  { href: '/organisation', label: 'Organisation', icon: <Building2 className="w-5 h-5" /> },
  { href: '/activity', label: 'Activity', icon: <Activity className="w-5 h-5" /> },
  { href: '/logs', label: 'Logs', icon: <ScrollText className="w-5 h-5" /> },
]

export const AppLayout = () => {
  const { session, user, loading, isDemoUser, logout } = useAuth()
  const [signingOut, setSigningOut] = useState(false)
  const [isMobileNavOpen, setIsMobileNavOpen] = useState(false)
  const [isMobileViewport, setIsMobileViewport] = useState(() => {
    if (typeof window === 'undefined') return false
    return window.matchMedia('(max-width: 767px)').matches
  })
  const location = useLocation()
  const [pendingRedirect, setPendingRedirect] = useState(false)
  const accountsUrl =
    (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? 'https://accounts.rcsn01.com'
  const redirectTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [currentOrg, setCurrentOrg] = useState<OrgSimple | null>(null)
  const [dashboardSearch, setDashboardSearch] = useState('')
  const [gallerySearch, setGallerySearch] = useState('')
  const [teamSearch, setTeamSearch] = useState('')
  const { data: userOrgs = [] } = useUserOrganisations(user?.id)
  const isDashboard = location.pathname.startsWith('/dashboard')
  const isGallery = location.pathname.startsWith('/gallery')
  const isOrganisationTeam =
    location.pathname === '/organisation' || location.pathname.startsWith('/organisation/team')

  useEffect(() => {
    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const applyViewport = () => {
      const isMobile = mediaQuery.matches || window.innerWidth <= 767
      setIsMobileViewport(isMobile)
      if (!isMobile) {
        setIsMobileNavOpen(false)
      }
    }

    applyViewport()

    const onChange = () => applyViewport()
    mediaQuery.addEventListener('change', onChange)
    window.addEventListener('resize', onChange)

    return () => {
      mediaQuery.removeEventListener('change', onChange)
      window.removeEventListener('resize', onChange)
    }
  }, [])

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
    </>
  )

  const topBarSearch =
    isDashboard ? (
      <Input
        placeholder="Search workflows..."
        value={dashboardSearch}
        onChange={(e) => setDashboardSearch(e.target.value)}
        prefix={<Search className="w-4 h-4" />}
        className="max-w-xs rounded-[var(--radius-lg)]"
      />
    ) : isGallery ? (
      <Input
        placeholder="Search workflows..."
        value={gallerySearch}
        onChange={(e) => setGallerySearch(e.target.value)}
        prefix={<Search className="w-4 h-4" />}
        className="max-w-xs rounded-[var(--radius-lg)]"
      />
    ) : isOrganisationTeam ? (
      <Input
        placeholder="Search members..."
        value={teamSearch}
        onChange={(e) => setTeamSearch(e.target.value)}
        prefix={<Search className="w-4 h-4" />}
        className="max-w-xs rounded-[var(--radius-lg)]"
      />
    ) : null

  const topBar = topBarSearch ? (
    <SwitchAppTopBar
      left={topBarSearch}
      profileFallback={user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
      mobileSidebarToggle={{
        enabled: isMobileViewport,
        isOpen: isMobileNavOpen,
        onOpen: () => setIsMobileNavOpen(true),
        ariaLabel: 'Toggle side navigation',
      }}
      onSettingsClick={() => {
        window.location.assign(buildAccountsSettingsUrl({ accountsUrl }))
      }}
      onLogout={handleSignOut}
    />
  ) : undefined

  const outletContext = isDashboard
    ? { currentOrg, dashboardSearch, setDashboardSearch }
    : isGallery
      ? { currentOrg, gallerySearch, setGallerySearch }
      : { currentOrg, teamSearch, setTeamSearch }

  return (
    <SharedAppLayout
      sidebar={sidebar}
      topBar={topBar}
      profileFallback={user?.user_metadata?.full_name?.[0] || user?.email?.[0] || 'U'}
      onSettingsClick={() => {
        window.location.assign(buildAccountsSettingsUrl({ accountsUrl }))
      }}
      onLogout={handleSignOut}
      mobileSidebar={{
        enabled: isMobileViewport,
        isOpen: isMobileNavOpen,
        onOpen: () => setIsMobileNavOpen(true),
        onClose: () => setIsMobileNavOpen(false),
        toggleAriaLabel: 'Toggle side navigation',
      }}
    >
      <Outlet context={outletContext} />
    </SharedAppLayout>
  )
}
