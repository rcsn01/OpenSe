import { Navigate, Route, Routes, useLocation } from 'react-router-dom'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { ThemeProvider } from '@repo/ui'
import { GodModePage } from './pages/GodModePage'
import { LoginPage } from './pages/LoginPage'
import { PlatformOverviewPage } from './pages/PlatformOverviewPage'
import { ApplicationManagementPage } from './pages/ApplicationManagementPage'
import { FinancialsPage } from './pages/FinancialsPage'
import { PlatformAdministrationPage } from './pages/PlatformAdministrationPage'
import { OrganizationsListPage } from './pages/OrganizationsListPage'
import { OrganizationProfilePage } from './pages/OrganizationProfilePage'
import { AdminShell } from './components/AdminShell'

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
        element={
          <ProtectedSuperAdminRoute>
            <AdminShell />
          </ProtectedSuperAdminRoute>
        }
      >
        <Route path="/platform" element={<PlatformOverviewPage />} />
        <Route path="/organisations" element={<OrganizationsListPage />} />
        <Route path="/organisations/:orgId" element={<OrganizationProfilePage />} />
        <Route path="/applications" element={<ApplicationManagementPage />} />
        <Route path="/financials" element={<FinancialsPage />} />
        <Route path="/platform-admin" element={<PlatformAdministrationPage />} />
      </Route>
      <Route path="/etl-admin" element={<Navigate to="/organisations" replace />} />
      <Route path="/super-admin" element={<Navigate to="/organisations" replace />} />
      <Route
        path="/"
        element={
          loading ? (
            <div className="min-h-screen grid place-items-center text-sm text-slate-500">Loading session...</div>
          ) : user && isSuperAdmin ? (
            <Navigate to="/platform" replace />
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
