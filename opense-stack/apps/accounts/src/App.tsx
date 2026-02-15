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

const ProtectedAccountRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading session...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ next: location.pathname }} replace />
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
