import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { EmptyState, ThemeProvider } from '@repo/ui'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { SharedLoginRoutePage } from './pages/SharedLoginRoutePage'
import { SharedSignupRoutePage } from './pages/SharedSignupRoutePage'
import { AccountShell } from './components/AccountShell'
import { HomePage } from './pages/HomePage'
import { ProfilePage } from './pages/ProfilePage'
import { SecurityPage } from './pages/SecurityPage'
import { OrganisationPage } from './pages/OrganisationPage'
import { BillingPage } from './pages/BillingPage'
import { SeatManagementPage } from './pages/SeatManagementPage'
import { ActivityLogPage } from './pages/ActivityLogPage'
import { SettingsPage } from './pages/SettingsPage'
import { getOnboardingStatus, type OnboardingStatus } from './api/onboarding'
import { OnboardingStartPage } from './pages/OnboardingStartPage'
import { OnboardingInvitationChoicePage } from './pages/OnboardingInvitationChoicePage'
import { OnboardingCreateOrganisationPage } from './pages/OnboardingCreateOrganisationPage'
import { OnboardingInviteMembersPage } from './pages/OnboardingInviteMembersPage'
import { OnboardingBlockedPage } from './pages/OnboardingBlockedPage'
import { getOnboardingCompletedFallbackPath, getOnboardingPathForStatus, getOnboardingStatusScope } from './lib/onboardingUi'
import { buildPathWithQuery } from './lib/redirect'

const LoadingSession = () => <EmptyState title="Loading session..." description="" />

const OnboardingGate = () => {
  const location = useLocation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const routeScope = getOnboardingStatusScope(location.pathname)
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [onboardingLoading, setOnboardingLoading] = useState(true)
  const [onboardingStatusScope, setOnboardingStatusScope] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false

    const loadOnboardingStatus = async () => {
      if (!userId) {
        if (cancelled) return
        setOnboardingStatus(null)
        setOnboardingStatusScope(routeScope)
        setOnboardingLoading(false)
        return
      }

      try {
        setOnboardingLoading(true)
        const status = await getOnboardingStatus()
        if (cancelled) return
        setOnboardingStatus(status)
      } catch {
        if (cancelled) return
        setOnboardingStatus({
          needsOnboarding: true,
          step: 'create',
          pendingInvites: [],
          orgId: null,
          orgName: null,
          role: null,
        })
      } finally {
        if (!cancelled) {
          setOnboardingStatusScope(routeScope)
          setOnboardingLoading(false)
        }
      }
    }

    void loadOnboardingStatus()

    return () => {
      cancelled = true
    }
  }, [userId, routeScope])

  if (onboardingLoading || onboardingStatusScope !== routeScope) {
    return <LoadingSession />
  }

  if (!user) {
    return <Navigate to="/login" state={{ next: `${location.pathname}${location.search}${location.hash}` }} replace />
  }

  const isOnboardingRoute = location.pathname.startsWith('/onboarding')
  const onboardingPath = onboardingStatus ? getOnboardingPathForStatus(onboardingStatus) : null

  if (onboardingStatus?.needsOnboarding && onboardingPath && !isOnboardingRoute) {
    return <Navigate to={buildPathWithQuery(onboardingPath)} replace />
  }

  if (onboardingStatus?.needsOnboarding && onboardingPath && isOnboardingRoute && location.pathname !== onboardingPath) {
    return <Navigate to={buildPathWithQuery(onboardingPath)} replace />
  }

  if (!onboardingStatus?.needsOnboarding && isOnboardingRoute) {
    return <Navigate to={getOnboardingCompletedFallbackPath()} replace />
  }

  return <Outlet />
}

function ConfiguredAccountsRoutes() {
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <ThemeProvider
        defaultTheme="light"
        storageKey="opense-theme"
        cookieKey="opense-theme"
        respectStoredTheme={true}
      >
        <LoadingSession />
      </ThemeProvider>
    )
  }

  if (!user) {
    return (
      <ThemeProvider
        defaultTheme="light"
        storageKey="opense-theme"
        cookieKey="opense-theme"
        respectStoredTheme={true}
      >
        <Routes>
          <Route path="/login" element={<SharedLoginRoutePage />} />
          <Route path="/signin" element={<Navigate to="/login" replace />} />
          <Route path="/register" element={<SharedSignupRoutePage />} />
          <Route path="/signup" element={<Navigate to="/register" replace />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </ThemeProvider>
    )
  }

  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={true}
    >
      <Routes>
        <Route element={<OnboardingGate />}>
          <Route path="/" element={<Navigate to="/account/home" replace />} />
          <Route path="/onboarding" element={<OnboardingStartPage />} />
          <Route path="/onboarding/invitations" element={<OnboardingInvitationChoicePage />} />
          <Route path="/onboarding/create-organisation" element={<OnboardingCreateOrganisationPage />} />
          <Route path="/onboarding/invite-members" element={<OnboardingInviteMembersPage />} />
          <Route path="/onboarding/blocked" element={<OnboardingBlockedPage />} />

          <Route element={<AccountShell />}>
            <Route path="/account" element={<Navigate to="/account/home" replace />} />
            <Route path="/accounts" element={<Navigate to="/account/home" replace />} />
            <Route path="/account/home" element={<HomePage />} />
            <Route path="/account/profile" element={<ProfilePage />} />
            <Route path="/account/security" element={<SecurityPage />} />
            <Route path="/account/organisation" element={<OrganisationPage />} />
            <Route path="/account/billing" element={<BillingPage />} />
            <Route path="/account/seats" element={<SeatManagementPage />} />
            <Route path="/account/activity" element={<ActivityLogPage />} />
            <Route path="/account/settings" element={<SettingsPage />} />

            <Route path="/account/preferences" element={<Navigate to="/account/settings" replace />} />
            <Route path="/account/general" element={<Navigate to="/account/settings" replace />} />

            <Route path="/general" element={<Navigate to="/account/settings" replace />} />
            <Route path="/settings" element={<Navigate to="/account/settings" replace />} />
            <Route path="/organisation" element={<Navigate to="/account/organisation" replace />} />
            <Route path="/billing" element={<Navigate to="/account/billing" replace />} />
            <Route path="/seats" element={<Navigate to="/account/seats" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/account/home" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}

const ConfiguredAccountsApp = () => (
  <AuthProvider>
    <ConfiguredAccountsRoutes />
  </AuthProvider>
)

export default ConfiguredAccountsApp
