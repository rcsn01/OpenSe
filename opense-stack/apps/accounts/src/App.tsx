import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider, Spinner } from '@repo/ui'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { SharedLoginRoutePage } from './pages/SharedLoginRoutePage'
import { SharedSignupRoutePage } from './pages/SharedSignupRoutePage'
import { AccountShell } from './components/AccountShell'
import { OnboardingLayout } from './components/OnboardingLayout'
import { AccountSettingsPage } from './pages/AccountSettingsPage'
import { OrganisationSettingsPage } from './pages/OrganisationSettingsPage'
import { BillingPage } from './pages/BillingPage'
import { SeatManagementPage } from './pages/SeatManagementPage'
import { OnboardingRootPage } from './pages/onboarding/OnboardingRootPage'
import { OnboardingInvitationChoicePage } from './pages/onboarding/OnboardingInvitationChoicePage'
import { OnboardingCreateOrgPage } from './pages/onboarding/OnboardingCreateOrgPage'
import { OnboardingInviteMembersPage } from './pages/onboarding/OnboardingInviteMembersPage'
import { userHasOrganisation } from './api/onboarding'

const ProtectedAccountRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { user, loading } = useAuth()

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center text-sm text-slate-500">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!user) {
    return <Navigate to="/login" state={{ next: location.pathname }} replace />
  }

  return <>{children}</>
}

/** Redirects to onboarding if user has no organisation. Used for main app routes. */
const RequireOrganisation = ({ children }: { children: React.ReactNode }) => {
  const [hasOrg, setHasOrg] = useState<boolean | null>(null)

  useEffect(() => {
    userHasOrganisation().then(setHasOrg).catch(() => setHasOrg(false))
  }, [])

  if (hasOrg === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner size="lg" />
      </div>
    )
  }

  if (!hasOrg) {
    return <Navigate to="/onboarding" replace />
  }

  return <>{children}</>
}

const RootRedirect = () => {
  const [hasOrg, setHasOrg] = useState<boolean | null>(null)

  useEffect(() => {
    userHasOrganisation().then(setHasOrg).catch(() => setHasOrg(false))
  }, [])

  if (hasOrg === null) {
    return (
      <div className="min-h-screen grid place-items-center">
        <Spinner size="lg" />
      </div>
    )
  }

  return <Navigate to={hasOrg ? '/settings' : '/onboarding'} replace />
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
              <RootRedirect />
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
              <OnboardingLayout />
            </ProtectedAccountRoute>
          }
        >
          <Route index element={<OnboardingRootPage />} />
          <Route path="invitations" element={<OnboardingInvitationChoicePage />} />
          <Route path="create" element={<OnboardingCreateOrgPage />} />
          <Route path="invite" element={<OnboardingInviteMembersPage />} />
        </Route>
        <Route
          element={
            <ProtectedAccountRoute>
              <RequireOrganisation>
                <AccountShell />
              </RequireOrganisation>
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
