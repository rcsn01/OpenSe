import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { EmptyState, ThemeProvider } from '@repo/ui'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { SharedLoginRoutePage } from './pages/SharedLoginRoutePage'
import { SharedSignupRoutePage } from './pages/SharedSignupRoutePage'
import { AccountShell } from './components/AccountShell'
import { GeneralSettingsPage } from './pages/GeneralSettingsPage'
import { AccountSettingsPage } from './pages/AccountSettingsPage'
import { OrganisationSettingsPage } from './pages/OrganisationSettingsPage'
import { BillingPage } from './pages/BillingPage'
import { SeatManagementPage } from './pages/SeatManagementPage'
import { getOnboardingStatus, type OnboardingStatus } from './api/onboarding'
import { OnboardingStartPage } from './pages/OnboardingStartPage'
import { OnboardingInvitationChoicePage } from './pages/OnboardingInvitationChoicePage'
import { OnboardingCreateOrganisationPage } from './pages/OnboardingCreateOrganisationPage'
import { OnboardingInviteMembersPage } from './pages/OnboardingInviteMembersPage'

const getOnboardingRouteFromStatus = (status: OnboardingStatus) => {
  if (status.step === 'invites') return '/onboarding/invitations'
  if (status.step === 'create') return '/onboarding/create-organisation'
  if (status.step === 'invite-members') return '/onboarding/invite-members'
  return '/account/general'
}

const LoadingSession = () => <EmptyState title="Loading session..." description="" />

const OnboardingGate = () => {
  const location = useLocation()
  const { user } = useAuth()
  const userId = user?.id ?? null
  const routeScope = location.pathname.startsWith('/onboarding') ? 'onboarding' : 'account'
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
        if (cancelled) return
        setOnboardingStatusScope(routeScope)
        setOnboardingLoading(false)
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

  if (onboardingStatus?.needsOnboarding && !isOnboardingRoute) {
    return <Navigate to={getOnboardingRouteFromStatus(onboardingStatus)} replace />
  }

  if (!onboardingStatus?.needsOnboarding && isOnboardingRoute) {
    return <Navigate to="/account/general" replace />
  }

  return <Outlet />
}

function App() {
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
          <Route path="/" element={<Navigate to="/account/general" replace />} />
          <Route path="/onboarding" element={<OnboardingStartPage />} />
          <Route path="/onboarding/invitations" element={<OnboardingInvitationChoicePage />} />
          <Route path="/onboarding/create-organisation" element={<OnboardingCreateOrganisationPage />} />
          <Route path="/onboarding/invite-members" element={<OnboardingInviteMembersPage />} />

          <Route element={<AccountShell />}>
            <Route path="/account" element={<Navigate to="/account/general" replace />} />
            <Route path="/account/general" element={<GeneralSettingsPage />} />
            <Route path="/account/settings" element={<AccountSettingsPage />} />
            <Route path="/account/organisation" element={<OrganisationSettingsPage />} />
            <Route path="/account/billing" element={<BillingPage />} />
            <Route path="/account/seats" element={<SeatManagementPage />} />

            <Route path="/general" element={<Navigate to="/account/general" replace />} />
            <Route path="/settings" element={<Navigate to="/account/settings" replace />} />
            <Route path="/organisation" element={<Navigate to="/account/organisation" replace />} />
            <Route path="/billing" element={<Navigate to="/account/billing" replace />} />
            <Route path="/seats" element={<Navigate to="/account/seats" replace />} />
          </Route>

          <Route path="*" element={<Navigate to="/account/general" replace />} />
        </Route>
      </Routes>
    </ThemeProvider>
  )
}

const AppWithProviders = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
)

export default AppWithProviders
