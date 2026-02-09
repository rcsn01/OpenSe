import { Navigate, Outlet, Route, Routes } from 'react-router-dom'
import './App.css'
import { Layout } from './components/Layout'
import { CompanyProvider, useCompany } from './contexts/CompanyContext'
import { Auth } from './pages/Auth'
import { CompanySetup } from './pages/CompanySetup'
import { Dashboard } from './pages/Dashboard'
import { InventoryList } from './pages/Inventory'
import { CreateProduct } from './pages/product/CreateProduct' // Added Import
import { Scan } from './pages/Scan'
import { LabelStudio } from './pages/LabelStudio'
import { ProductDetail } from './pages/ProductDetail'
import { TeamSettings } from './pages/TeamSettings'
import { Attributes } from './pages/Attributes'
import { Reports } from './pages/Reports'
import { Procurement } from './pages/Procurement'
import { Alerts } from './pages/Alerts'
import { useSession } from './hooks/useSession'
import { Toaster } from 'sonner'

const CompanyGate = () => {
  const { companies, isLoading } = useCompany()

  if (isLoading) {
    return <div className="empty-state">Loading workspace...</div>
  }

  if (companies.length === 0) {
    return <CompanySetup />
  }

  return <Outlet />
}

function App() {
  const { session, isLoading } = useSession()

  if (isLoading) {
    return <div className="empty-state">Loading session...</div>
  }

  if (!session) {
    return <Auth />
  }

  return (
    <CompanyProvider userId={session.user.id}>
      <Toaster position="top-right" richColors />
      <Routes>
        <Route element={<Layout />}>
          <Route element={<CompanyGate />}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/inventory" element={<InventoryList />} />
            <Route path="/inventory/new" element={<CreateProduct />} /> {/* Added Route */}
            <Route path="/inventory/:id" element={<ProductDetail />} />
            <Route path="/scan" element={<Scan />} />
            <Route path="/tools/labels" element={<LabelStudio />} />
            <Route path="/settings/team" element={<TeamSettings />} />
            <Route path="/settings/attributes" element={<Attributes />} />
            <Route path="/reports" element={<Reports />} />
            <Route path="/procurement" element={<Procurement />} />
            <Route path="/alerts" element={<Alerts />} />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Route>
      </Routes>
    </CompanyProvider>
  )
}

export default App