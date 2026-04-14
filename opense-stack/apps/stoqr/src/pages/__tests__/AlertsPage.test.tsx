import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes, useLocation } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { AlertsPage } from '../AlertsPage'

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

const LocationProbe = () => {
  const location = useLocation()
  return <div data-testid="location-path">{location.pathname}</div>
}

const renderAlertsRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route
          path="/alerts/:tab"
          element={
            <>
              <AlertsPage />
              <LocationProbe />
            </>
          }
        />
      </Routes>
    </MemoryRouter>,
  )

describe('AlertsPage', () => {
  it('renders the new feed and supports bulk dismiss actions', async () => {
    const user = userEvent.setup()

    renderAlertsRoute('/alerts/feed')

    const alertsFeedTab = screen.getByRole('button', { name: /alerts feed/i })

    expect(alertsFeedTab).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Alert Rules' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /notifications/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /email \/ push/i })).not.toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /history/i })).not.toBeInTheDocument()
    expect(screen.getByText('Out of Stock: Premium Widget')).toBeInTheDocument()
    expect(within(alertsFeedTab).getByText('7')).toBeInTheDocument()

    await user.click(screen.getByLabelText('Select all visible alerts'))
    await user.click(screen.getByRole('button', { name: 'Dismiss' }))

    expect(screen.getByText('No alerts match the current filters.')).toBeInTheDocument()
    expect(within(alertsFeedTab).getByText('0')).toBeInTheDocument()
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
})