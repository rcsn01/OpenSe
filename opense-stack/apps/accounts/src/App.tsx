import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { ThemeProvider } from '@repo/ui'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { SharedLoginRoutePage } from './pages/SharedLoginRoutePage'
import { SharedSignupRoutePage } from './pages/SharedSignupRoutePage'
import { AccountShell } from './components/AccountShell'
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
              <Navigate to="/account/billing" replace />
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
          <Route path="/account" element={<Navigate to="/account/billing" replace />} />
          <Route path="/account/settings" element={<OrganisationSettingsPage />} />
          <Route path="/account/billing" element={<BillingPage />} />
          <Route path="/account/seats" element={<SeatManagementPage />} />
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
