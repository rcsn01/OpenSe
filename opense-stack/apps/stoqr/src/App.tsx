import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import { ThemeProvider } from '@repo/ui'
import { AuthRedirectPage } from '@repo/shared/auth'
import './App.css'
import { AppLayout } from './layouts/AppLayout'
import { CompanyProvider, useCompany } from './contexts/CompanyContext'
import { buildAccountsAuthUrl } from './lib/authRedirect'
import { LandingPage } from './pages/LandingPage'
import { CompanySetupPage } from './pages/CompanySetupPage'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryListPage } from './pages/InventoryPage'
import { CreateProductPage } from './pages/product/CreateProductPage'
import { ScanPage } from './pages/ScanPage'
import { LabelStudioPage } from './pages/LabelStudioPage'
import { ProductDetailPage } from './pages/product/ProductDetailPage'
import { TeamSettingsPage } from './pages/TeamSettingsPage'
import { AttributesPage } from './pages/AttributesPage'
import { ReportsPage } from './pages/ReportsPage'
import { ProcurementPage } from './pages/ProcurementPage'
import { AlertsPage } from './pages/AlertsPage'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { Toaster } from 'sonner'

const CompanyGate = () => {
  const { companies, isLoading } = useCompany()

  if (isLoading) {
    return <div className="empty-state">Loading workspace...</div>
  }

  if (companies.length === 0) {
    return <CompanySetupPage />
  }

  return <Outlet />
}

function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <div className="empty-state">Loading session...</div>
  }

  if (!user) {
    return (
      <ThemeProvider
        defaultTheme="light"
        storageKey="opense-theme"
        cookieKey="opense-theme"
        respectStoredTheme={false}
      >
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<LandingPage />} />
          <Route path="/auth" element={<AuthRedirectPage mode="signin" buildAuthUrl={buildAccountsAuthUrl} />} />
          <Route path="/signup" element={<AuthRedirectPage mode="signup" buildAuthUrl={buildAccountsAuthUrl} />} />
          <Route path="*" element={<Navigate to="/" replace />} />
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
      <CompanyProvider userId={user.id}>
        <Toaster position="top-right" richColors />
        <Routes>
          <Route element={<AppLayout />}>
            <Route element={<CompanyGate />}>
              <Route index element={<Navigate to="/dashboard" replace />} />
              <Route path="/dashboard" element={<DashboardPage />} />
              <Route path="/inventory" element={<InventoryListPage />} />
              <Route path="/inventory/new" element={<CreateProductPage />} />
              <Route path="/inventory/:id" element={<ProductDetailPage />} />
              <Route path="/scan" element={<ScanPage />} />
              <Route path="/tools/labels" element={<LabelStudioPage />} />
              <Route path="/settings/team" element={<TeamSettingsPage />} />
              <Route path="/settings/attributes" element={<AttributesPage />} />
              <Route path="/reports" element={<ReportsPage />} />
              <Route path="/procurement" element={<ProcurementPage />} />
              <Route path="/alerts" element={<AlertsPage />} />
            </Route>
            <Route path="*" element={<Navigate to="/dashboard" replace />} />
          </Route>
        </Routes>
      </CompanyProvider>
    </ThemeProvider>
  )
}

const AppWithProviders = () => (
  <AuthProvider>
    <App />
  </AuthProvider>
)

export default AppWithProviders