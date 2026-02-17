import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@repo/ui'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { SharedLoginRoutePage } from './pages/SharedLoginRoutePage'
import { SharedSignupRoutePage } from './pages/SharedSignupRoutePage'
import { AccountShell } from './components/AccountShell'
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
  return '/settings'
}

const ProtectedAccountRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { user, loading } = useAuth()
  const [onboardingStatus, setOnboardingStatus] = useState<OnboardingStatus | null>(null)
  const [onboardingLoading, setOnboardingLoading] = useState(true)

  useEffect(() => {
    const loadOnboardingStatus = async () => {
      if (!user) {
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
  }, [location.pathname, user?.id])

  if (loading || onboardingLoading) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading session...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ next: location.pathname }} replace />
  }

  const isOnboardingRoute = location.pathname.startsWith('/onboarding')

  if (onboardingStatus?.needsOnboarding && !isOnboardingRoute) {
    return <Navigate to={getOnboardingRouteFromStatus(onboardingStatus)} replace />
  }

  if (!onboardingStatus?.needsOnboarding && isOnboardingRoute) {
    return <Navigate to="/settings" replace />
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
              <Navigate to="/settings" replace />
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
          <Route path="/settings" element={<AccountSettingsPage />} />
          <Route path="/organisation" element={<OrganisationSettingsPage />} />
          <Route path="/billing" element={<BillingPage />} />
          <Route path="/seats" element={<SeatManagementPage />} />

          <Route path="/account" element={<Navigate to="/settings" replace />} />
          <Route path="/account/settings" element={<Navigate to="/settings" replace />} />
          <Route path="/account/organisation" element={<Navigate to="/organisation" replace />} />
          <Route path="/account/billing" element={<Navigate to="/billing" replace />} />
          <Route path="/account/seats" element={<Navigate to="/seats" replace />} />
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
