import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@repo/ui'
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

const ProtectedAccountRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { user, loading } = useAuth()
  const userId = user?.id ?? null
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [onboardingLoading, setOnboardingLoading] = useState(true)

  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!userId) {
        setOnboardingStatus(null)
        setOnboardingLoading(false)
        return
      }

      try {
        setOnboardingLoading(true)
        const status = await getOnboardingStatus()
        setOnboardingStatus(status)
      } catch {
        setOnboardingStatus({
          needsOnboarding: true,
          step: 'create',
          pendingInvites: [],
          orgId: null,
          orgName: null,
          role: null,
        })
      } finally {
        setOnboardingLoading(false)
      }
    }

    void loadOnboardingStatus()
  }, [userId])

  if (loading || onboardingLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading session...</div>
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

  return <>{children}</>
}

function App() {
  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={false}
    >
      <Routes>
        <Route
          path="/"
          element={
            <ProtectedAccountRoute>
              <Navigate to="/account/general" replace />
            </ProtectedAccountRoute>
          }
        />
        <Route path="/login" element={<SharedLoginRoutePage />} />
        <Route path="/signin" element={<Navigate to="/login" replace />} />
        <Route path="/register" element={<SharedSignupRoutePage />} />
        <Route path="/signup" element={<Navigate to="/register" replace />} />
        <Route
          path="/onboarding"
          element={
            <ProtectedAccountRoute>
              <OnboardingStartPage />
            </ProtectedAccountRoute>
          }
        />
        <Route
          path="/onboarding/invitations"
          element={
            <ProtectedAccountRoute>
              <OnboardingInvitationChoicePage />
            </ProtectedAccountRoute>
          }
        />
        <Route
          path="/onboarding/create-organisation"
          element={
            <ProtectedAccountRoute>
              <OnboardingCreateOrganisationPage />
            </ProtectedAccountRoute>
          }
        />
        <Route
          path="/onboarding/invite-members"
          element={
            <ProtectedAccountRoute>
              <OnboardingInviteMembersPage />
            </ProtectedAccountRoute>
          }
        />
        <Route
          element={
            <ProtectedAccountRoute>
              <AccountShell />
            </ProtectedAccountRoute>
          }
        >
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
        <Route path="*" element={<Navigate to="/login" replace />} />
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
