import { useEffect, useState } from 'react'
import { Navigate, Outlet, Route, Routes, useLocation, useParams } from 'react-router-dom'
import { EmptyState, ThemeProvider } from '@repo/ui'
import { AuthRedirectPage } from '@repo/shared/auth'
import { AppLayout } from './layouts/AppLayout'
import { CompanyProvider, useCompany } from './contexts/CompanyContext'
import { buildAccountsAuthUrl, buildAccountsOnboardingUrl } from './lib/authRedirect'
import { DashboardPage } from './pages/DashboardPage'
import { InventoryImportPage } from './pages/InventoryImportPage'
import { InventoryListPage } from './pages/InventoryPage'
import { CreateProductPage } from './pages/product/CreateProductPage'
import { EditProductPage } from './pages/product/EditProductPage'
import { ProductAdjustPage } from './pages/product/ProductAdjustPage'
import { ScanPage } from './pages/ScanPage'
import { LabelStudioPage } from './pages/LabelStudioPage'
import { LabelDesignerPage } from './pages/LabelDesignerPage'
import { ProductDetailPage } from './pages/product/ProductDetailPage'
import { TeamSettingsPage } from './pages/TeamSettingsPage'
import { RolePermissionsEditPage } from './pages/RolePermissionsEditPage'
import { ReportsPage } from './pages/ReportsPage'
import { ProcurementPage } from './pages/ProcurementPage'
import { AlertsPage } from './pages/AlertsPage'
import { AlertRuleEditorPage } from './pages/AlertRuleEditorPage'
import { AlertDetailPage } from './pages/AlertDetailPage'
import { PermissionRoute } from './components/PermissionGate'
import { AuthProvider, useAuth } from '@repo/shared/auth/context'
import { Toaster } from 'sonner'

const CompanyGate = () => {
  const { companies, isLoading, loadError } = useCompany()
  const location = useLocation()
  const [redirecting, setRedirecting] = useState(false)
  const shouldRedirectToOnboarding = !isLoading && !loadError && companies.length === 0

  useEffect(() => {
    if (!shouldRedirectToOnboarding) {
      setRedirecting(false)
      return
    }

    setRedirecting(true)
    window.location.assign(
      buildAccountsOnboardingUrl(
        `${location.pathname}${location.search}${location.hash}`,
      ),
    )
  }, [location.hash, location.pathname, location.search, shouldRedirectToOnboarding])

  if (isLoading) {
    return <EmptyState title="Loading workspace..." description="" />
  }

  if (shouldRedirectToOnboarding || redirecting) {
    return <EmptyState title="Redirecting to Accounts..." description="" />
  }

  return <Outlet />
}

const LegacyTeamSettingsRedirect = () => {
  const { tab } = useParams<{ tab?: string }>()
  return <Navigate to={`/settings/organisations/${tab ?? 'teams'}`} replace />
}

export const RootRedirect = () => {
  const { user, loading } = useAuth()

  if (loading) {
    return <EmptyState title="Loading session..." description="" />
  }

  return <Navigate to={user ? '/dashboard' : '/auth'} replace />
}

export function App() {
  const { user, loading } = useAuth()

  if (loading) {
    return <EmptyState title="Loading session..." description="" />
  }

  if (!user) {
    return (
      <ThemeProvider
        defaultTheme="light"
        storageKey="opense-theme"
        cookieKey="opense-theme"
        respectStoredTheme={true}
      >
        <Toaster position="top-right" richColors />
        <Routes>
          <Route path="/" element={<RootRedirect />} />
          <Route path="/auth" element={<AuthRedirectPage mode="signin" buildAuthUrl={buildAccountsAuthUrl} />} />
          <Route path="/signup" element={<AuthRedirectPage mode="signup" buildAuthUrl={buildAccountsAuthUrl} />} />
          <Route path="*" element={<Navigate to="/auth" replace />} />
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
          <Route element={<CompanyGate />}>
            <Route element={<AppLayout />}>
              <Route index element={<RootRedirect />} />
              <Route element={<PermissionRoute permission="dashboard.view" />}>
                <Route path="/dashboard" element={<DashboardPage />} />
              </Route>
              <Route element={<PermissionRoute permission="inventory.view" />}>
                <Route path="/inventory" element={<Navigate to="/inventory/all" replace />} />
                <Route path="/inventory/:tab" element={<InventoryListPage />} />
              </Route>
              <Route element={<PermissionRoute permission="inventory.import_export" />}>
                <Route path="/inventory/import" element={<InventoryImportPage />} />
              </Route>
              <Route element={<PermissionRoute permission="inventory.create" />}>
                <Route path="/inventory/new" element={<CreateProductPage />} />
              </Route>
              <Route element={<PermissionRoute permission="inventory.edit" />}>
                <Route path="/inventory/:id/edit" element={<EditProductPage />} />
              </Route>
              <Route element={<PermissionRoute permission="inventory.adjust" />}>
                <Route path="/inventory/:id/adjust" element={<ProductAdjustPage />} />
              </Route>
              <Route element={<PermissionRoute permission="inventory.use" />}>
                <Route path="/inventory/:id" element={<Navigate to="overview" replace />} />
                <Route path="/inventory/:id/:tab" element={<ProductDetailPage />} />
              </Route>
              <Route element={<PermissionRoute permission="scanner.view" />}>
                <Route path="/scan" element={<Navigate to="/scan/scan-actions" replace />} />
                <Route path="/scan/:tab" element={<ScanPage />} />
              </Route>
              <Route element={<PermissionRoute permission="labels.view" />}>
                <Route path="/tools/labels" element={<Navigate to="/tools/labels/templates" replace />} />
                <Route path="/tools/labels/design" element={<Navigate to="/tools/labels/templates" replace />} />
                <Route path="/tools/labels/downloads" element={<Navigate to="/tools/labels/preview-batch" replace />} />
                <Route path="/tools/labels/:tab/:templateId" element={<LabelDesignerPage />} />
                <Route path="/tools/labels/:tab" element={<LabelStudioPage />} />
              </Route>
              <Route path="/settings/team" element={<Navigate to="/settings/organisations/teams" replace />} />
              <Route path="/settings/team/:tab" element={<LegacyTeamSettingsRedirect />} />
              <Route element={<PermissionRoute permission="organisation.view" />}>
                <Route path="/settings/organisations" element={<Navigate to="/settings/organisations/teams" replace />} />
                <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
              </Route>
              <Route element={<PermissionRoute permission="organisation.roles.manage" />}>
                <Route path="/settings/organisations/permissions/:roleId" element={<RolePermissionsEditPage />} />
              </Route>
              <Route element={<PermissionRoute permission="reports.view" />}>
                <Route path="/reports" element={<Navigate to="/reports/stock-health" replace />} />
                <Route path="/reports/:tab" element={<ReportsPage />} />
              </Route>
              <Route element={<PermissionRoute permission="procurement.view" />}>
                <Route path="/procurement" element={<Navigate to="/procurement/purchase-orders" replace />} />
                <Route path="/procurement/:tab" element={<ProcurementPage />} />
              </Route>
              <Route element={<PermissionRoute permission="alerts.view" />}>
                <Route path="/alerts" element={<Navigate to="/alerts/feed" replace />} />
                <Route path="/alerts/feed/:eventId" element={<AlertDetailPage />} />
                <Route path="/alerts/:tab" element={<AlertsPage />} />
              </Route>
              <Route element={<PermissionRoute permission="alerts.manage" />}>
                <Route path="/alerts/rules/new" element={<AlertRuleEditorPage />} />
                <Route path="/alerts/rules/:ruleId" element={<AlertRuleEditorPage />} />
              </Route>
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
