import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AlertsPage } from '../AlertsPage'
import { AppLayout } from '../../layouts/AppLayout'

let mockOrganisationPageSettings = {
  reportsEnabled: true,
  procurementEnabled: true,
  alertsEnabled: true,
}

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => ({
    user: {
      email: 'operator@example.com',
      user_metadata: { full_name: 'Operator' },
    },
    logout: vi.fn(),
  }),
}))

vi.mock('@repo/shared/utils', () => ({
  buildAccountsSettingsUrl: () => '/accounts/settings',
}))

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

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const mockMatchMedia = (matches: boolean) =>
  vi.fn().mockImplementation(() => ({
    matches,
    media: '(max-width: 767px)',
    onchange: null,
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    addListener: vi.fn(),
    removeListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }))

const renderAlertsRoute = (initialEntry: string, withAppLayout = false) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        {withAppLayout ? (
          <Route element={<AppLayout />}>
            <Route
              path="/alerts/:tab"
              element={
                <>
                  <AlertsPage />
                  <LocationProbe />
                </>
              }
            />
          </Route>
        ) : (
          <Route
            path="/alerts/:tab"
            element={
              <>
                <AlertsPage />
                <LocationProbe />
              </>
            }
          />
        )}
      </Routes>
    </MemoryRouter>,
  )

describe('AlertsPage', () => {
  beforeEach(() => {
    mockOrganisationPageSettings = {
      reportsEnabled: true,
      procurementEnabled: true,
      alertsEnabled: true,
    }

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia(false),
    })
  })

  it('renders the new feed and supports bulk dismiss actions', async () => {
    const user = userEvent.setup()

    renderAlertsRoute('/alerts/feed')

    const alertsFeedTab = screen.getByRole('button', { name: /alerts feed/i })
    const alertsTabBar = alertsFeedTab.closest('nav')

    expect(alertsFeedTab).toBeInTheDocument()
    expect(alertsTabBar).not.toBeNull()
    expect(screen.getByRole('button', { name: 'Alert Rules' })).toBeInTheDocument()
    expect(alertsTabBar).toHaveClass('mb-[var(--gap-4)]')
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /email \/ push/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument()
    expect(screen.getByText('Out of Stock: Premium Widget')).toBeInTheDocument()
    expect(within(alertsFeedTab).getByText('7')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alert category filter' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Mark Read' })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Dismiss' })).not.toBeInTheDocument()

    await user.click(screen.getByLabelText('Select all visible alerts'))

    expect(screen.queryByRole('button', { name: 'Alert category filter' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Mark Read' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Dismiss' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.getByText('No alerts match the current filters.')).toBeInTheDocument()
    expect(within(alertsFeedTab).getByText('0')).toBeInTheDocument()
  })

  it('filters the feed from the top bar search on alerts routes', async () => {
    const user = userEvent.setup()

    renderAlertsRoute('/alerts/feed', true)

    const searchInput = screen.getByPlaceholderText('Search alerts...')

    expect(searchInput).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search items...')).not.toBeInTheDocument()

    await user.type(searchInput, 'scanner')

    expect(screen.getByText('Showing 1 of 7 alerts')).toBeInTheDocument()
    expect(screen.getByText('Hardware Offline: Main Dock Scanner')).toBeInTheDocument()
    expect(screen.queryByText('Out of Stock: Premium Widget')).not.toBeInTheDocument()
  })

  it('supports fuzzy matches from the top bar search on alerts routes', async () => {
    const user = userEvent.setup()

    renderAlertsRoute('/alerts/feed', true)

    await user.type(screen.getByPlaceholderText('Search alerts...'), 'po alpha')

    expect(screen.getByText('Showing 1 of 7 alerts')).toBeInTheDocument()
    expect(screen.getByText('PO Delayed: Alpha Supplies')).toBeInTheDocument()
    expect(screen.queryByText('Out of Stock: Premium Widget')).not.toBeInTheDocument()
  })

  it('filters the feed using the shared filter dropdown', async () => {
    const user = userEvent.setup()

    renderAlertsRoute('/alerts/feed')

    await user.click(screen.getByRole('button', { name: 'Alert category filter' }))
    await user.click(screen.getByRole('button', { name: 'Stock & Inventory' }))

    expect(screen.getByText('Showing 2 of 7 alerts')).toBeInTheDocument()
    expect(screen.getByText('Out of Stock: Premium Widget')).toBeInTheDocument()
    expect(screen.getByText('Expiry Warning: Organic Solvent')).toBeInTheDocument()
    expect(screen.queryByText('PO Delayed: Alpha Supplies')).not.toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Clear Stock & Inventory filter' }))

    expect(screen.getByText('Showing 7 of 7 alerts')).toBeInTheDocument()
  })

  it('redirects legacy notifications routes to feed and switches into alert rules', async () => {
    const user = userEvent.setup()

    renderAlertsRoute('/alerts/notifications')

    expect(screen.getByTestId('location-path')).toHaveTextContent('/alerts/feed')

    await user.click(screen.getByRole('button', { name: 'Alert Rules' }))

    expect(screen.getByTestId('location-path')).toHaveTextContent('/alerts/rules')
    expect(screen.getByRole('heading', { name: 'Global Threshold Settings' })).toBeInTheDocument()
    expect(screen.getByRole('heading', { name: 'Notification Routing' })).toBeInTheDocument()
    expect(screen.getByLabelText('Default Low Stock Threshold')).toHaveValue(50)
    expect(screen.getByLabelText('Expiry Warning Window')).toHaveValue(14)
    expect(screen.getByRole('combobox', { name: 'Procurement Alerts subscription' })).toHaveValue('purchasing-managers')
    expect(screen.getByRole('switch', { name: 'Toggle In-App Notifications' })).toHaveAttribute('aria-checked', 'true')
  })

  it('renders the unavailable message when alerts are disabled', () => {
    mockOrganisationPageSettings = {
      reportsEnabled: true,
      procurementEnabled: true,
      alertsEnabled: false,
    }

    renderAlertsRoute('/alerts/feed')

    expect(screen.getByText('Feature unavailable, please contact your admin for assistance.')).toBeInTheDocument()
    expect(screen.queryByText('Out of Stock: Premium Widget')).not.toBeInTheDocument()
  })
})