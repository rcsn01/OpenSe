import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../components/Search/TopBarSearch'
import { ReportsPage } from '../ReportsPage'

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

vi.mock('../../components/Reports/StockHealthValuationTab', () => ({
  StockHealthValuationTab: () => <div>Stock Health Content</div>,
}))

vi.mock('../../components/Reports/MovementVelocityTab', () => ({
  MovementVelocityTab: () => <div>Movement Velocity Content</div>,
}))

vi.mock('../../components/Reports/ProcurementSuppliersTab', () => ({
  ProcurementSuppliersTab: () => <div>Procurement Suppliers Content</div>,
}))

vi.mock('../../components/Reports/AuditsShrinkageTab', () => ({
  AuditsShrinkageTab: () => <div>Audits Shrinkage Content</div>,
}))

vi.mock('../../components/Reports/CustomSavedReportsTab', () => ({
  CustomSavedReportsTab: () => <div>Custom Saved Content</div>,
}))

const SearchShell = () => (
  <TopBarSearchProvider>
    <TopBarSearchContent />
    <Outlet />
  </TopBarSearchProvider>
)

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{`${location.pathname}${location.search}`}</div>
}

describe('ReportsPage', () => {
  beforeEach(() => {
    mockOrganisationPageSettings = {
      reportsEnabled: true,
      procurementEnabled: true,
      alertsEnabled: true,
    }
  })

  it('renders the consolidated reports tabs', () => {
    render(
      <MemoryRouter initialEntries={['/reports/stock-health']}>
        <Routes>
          <Route path="/reports/:tab" element={<ReportsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Stock Health & Valuation')).toBeInTheDocument()
    expect(screen.getByText('Movement & Velocity')).toBeInTheDocument()
    expect(screen.getByText('Procurement & Suppliers')).toBeInTheDocument()
    expect(screen.getByText('Audits & Shrinkage')).toBeInTheDocument()
    expect(screen.getByText('Custom & Saved Reports')).toBeInTheDocument()
    expect(screen.getByText('Stock Health Content')).toBeInTheDocument()
  })

  it('renders the unavailable message when reports are disabled', () => {
    mockOrganisationPageSettings = {
      reportsEnabled: false,
      procurementEnabled: true,
      alertsEnabled: true,
    }

    render(
      <MemoryRouter initialEntries={['/reports/stock-health']}>
        <Routes>
          <Route path="/reports/:tab" element={<ReportsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Feature unavailable, please contact your admin for assistance.')).toBeInTheDocument()
    expect(screen.queryByText('Stock Health & Valuation')).not.toBeInTheDocument()
  })

  it('navigates between report tabs from the shared top-bar search', async () => {
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/reports/stock-health']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route
              path="/reports/:tab"
              element={
                <>
                  <ReportsPage />
                  <LocationProbe />
                </>
              }
            />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search reports...' }), 'custom')
    await user.keyboard('{Enter}')

    expect(screen.getByTestId('location-path')).toHaveTextContent('/reports/custom-saved')
    expect(screen.getByText('Custom Saved Content')).toBeInTheDocument()
  })
})
