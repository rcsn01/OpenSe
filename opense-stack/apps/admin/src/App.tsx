import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { ThemeProvider } from '@repo/ui'
import { GodModePage } from './pages/GodModePage'
import { LoginPage } from './pages/LoginPage'
import { StoqrAdminPage } from './pages/StoqrAdminPage'

const ProtectedSuperAdminRoute = ({ children }: { children: React.ReactNode }) => {
  const location = useLocation()
  const { user, loading, isSuperAdmin, superAdminChecked } = useAuth()

  if (loading || !superAdminChecked) {
    return <div className="min-h-screen grid place-items-center text-sm text-slate-500">Checking access...</div>
  }

  if (!user) {
    return <Navigate to="/login" state={{ next: location.pathname }} replace />
  }

  if (!isSuperAdmin) {
    return <Navigate to="/login" replace />
  }

  return <>{children}</>
}

const AppRoutes = () => {
  const { user, loading, isSuperAdmin } = useAuth()

  return (
    <Routes>
      <Route path="/god-mode" element={<GodModePage />} />
      <Route path="/login" element={<LoginPage />} />
      <Route
        path="/stoqr"
        element={
          <ProtectedSuperAdminRoute>
            <StoqrAdminPage />
          </ProtectedSuperAdminRoute>
        }
      />
      <Route
        path="/"
        element={
          loading ? (
            <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading session...</div>
          ) : user && isSuperAdmin ? (
            <Navigate to="/stoqr" replace />
          ) : (
            <Navigate to="/login" replace />
          )
        }
      />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}

function App() {
  return (
    <ThemeProvider
      defaultTheme="light"
      storageKey="opense-theme"
      cookieKey="opense-theme"
      respectStoredTheme={false}
    >
      <AppRoutes />
    </ThemeProvider>
  )
}

const AppWithProviders = () => (
  <AuthProvider superAdmin>
    <App />
  </AuthProvider>
)

export default AppWithProviders
