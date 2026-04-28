import { render, screen } from '@testing-library/react'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ProcurementPage } from '../ProcurementPage'

let mockOrganisationPageSettings = {
  reportsEnabled: true,
  procurementEnabled: true,
  alertsEnabled: true,
}

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../hooks/queries/useOrganisationPageSettings', () => ({
  useOrganisationPageSettings: () => ({
    data: mockOrganisationPageSettings,
    isLoading: false,
  }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../components/Tabs', () => ({
  Tabs: ({ tabs, activeTab }: { tabs: Array<{ id: string; label: string; content: React.ReactNode }>; activeTab: string }) => (
    <div>
      {tabs.map((tab) => (
        <div key={tab.id}>{tab.label}</div>
      ))}
      <div>{tabs.find((tab) => tab.id === activeTab)?.content ?? null}</div>
    </div>
  ),
}))

vi.mock('../../components/Procurement/PurchaseOrdersTab', () => ({
  PurchaseOrdersTab: ({ searchTerm }: { searchTerm?: string }) => <div>Purchase Orders Content {searchTerm}</div>,
}))

vi.mock('../../components/Procurement/SuppliersTab', () => ({
  SuppliersTab: () => <div>Suppliers Content</div>,
}))

describe('ProcurementPage', () => {
  beforeEach(() => {
    mockOrganisationPageSettings = {
      reportsEnabled: true,
      procurementEnabled: true,
      alertsEnabled: true,
    }
  })

  it('renders the consolidated procurement tabs', () => {
    render(
      <MemoryRouter initialEntries={['/procurement/purchase-orders']}>
        <Routes>
          <Route element={<Outlet context={{ topBarSearchValue: 'Denied', setTopBarSearchValue: vi.fn() }} />}>
            <Route path="/procurement/:tab" element={<ProcurementPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Purchase Orders')).toBeInTheDocument()
    expect(screen.getByText('Suppliers')).toBeInTheDocument()
    expect(screen.queryByText('Incoming / Receiving')).not.toBeInTheDocument()
    expect(screen.queryByText('Purchase Requests')).not.toBeInTheDocument()
    expect(screen.queryByText('Vendor Returns')).not.toBeInTheDocument()
    expect(screen.queryByText('Procurement')).not.toBeInTheDocument()
    expect(screen.getByText('Purchase Orders Content Denied')).toBeInTheDocument()
  })

  it('renders the unavailable message when procurement is disabled', () => {
    mockOrganisationPageSettings = {
      reportsEnabled: true,
      procurementEnabled: false,
      alertsEnabled: true,
    }

    render(
      <MemoryRouter initialEntries={['/procurement/purchase-orders']}>
        <Routes>
          <Route element={<Outlet context={{ topBarSearchValue: 'Denied', setTopBarSearchValue: vi.fn() }} />}>
            <Route path="/procurement/:tab" element={<ProcurementPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Feature unavailable, please contact your admin for assistance.')).toBeInTheDocument()
    expect(screen.queryByText('Purchase Orders')).not.toBeInTheDocument()
  })
})