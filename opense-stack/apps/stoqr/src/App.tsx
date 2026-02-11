import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import { Layout } from './components/Layout'
import { CompanyProvider, useCompany } from './contexts/CompanyContext'
import { AuthPage } from './pages/AuthPage'
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
import { useSession } from './hooks/useSession'
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
  const { session, isLoading } = useSession()

  if (isLoading) {
    return <div className="empty-state">Loading session...</div>
  }

  if (!session) {
    return <AuthPage />
  }

  return (
    <CompanyProvider userId={session.user.id}>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route element={<Layout />}>
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
  )
}

export default App