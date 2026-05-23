import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { App } from '../App'

const mockUseAuth = vi.fn()
const mockUseCompany = vi.fn()
const assignMock = vi.fn()

vi.mock('@repo/shared/auth/context', () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useAuth: () => mockUseAuth(),
}))

vi.mock('@repo/ui', () => ({
  EmptyState: ({ title }: { title: string }) => <div>{title}</div>,
  ThemeProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../contexts/CompanyContext', () => ({
  CompanyProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
  useCompany: () => mockUseCompany(),
}))

vi.mock('../layouts/AppLayout', async () => {
  const { Outlet } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    AppLayout: () => (
      <div>
        <div>Protected app UI</div>
        <Outlet />
      </div>
    ),
  }
})

vi.mock('../components/PermissionGate', async () => {
  const { Outlet } = await vi.importActual<typeof import('react-router-dom')>('react-router-dom')
  return {
    PermissionRoute: () => <Outlet />,
  }
})

vi.mock('../pages/DashboardPage', () => ({
  DashboardPage: () => <div>Dashboard page</div>,
}))

vi.mock('../lib/authRedirect', () => ({
  buildAccountsAuthUrl: () => '/accounts/login',
  buildAccountsOnboardingUrl: (redirectPath?: string) =>
    `/accounts/onboarding?returnTo=${encodeURIComponent(redirectPath ?? '')}`,
}))

const renderApp = (initialEntry = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <App />
    </MemoryRouter>,
  )

describe('CompanyGate', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      loading: false,
      user: { id: 'user-1', email: 'user@example.com' },
    })
    mockUseCompany.mockReturnValue({
      companies: [{ id: 'company-1', name: 'Acme' }],
      isLoading: false,
      loadError: null,
    })
    assignMock.mockReset()
    Object.defineProperty(window, 'location', {
      configurable: true,
      value: {
        ...window.location,
        assign: assignMock,
      },
    })
  })

  it('renders the protected app when companies are present', () => {
    renderApp()

    expect(screen.getByText('Protected app UI')).toBeInTheDocument()
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('redirects loaded empty company lists to Accounts onboarding', async () => {
    mockUseCompany.mockReturnValue({
      companies: [],
      isLoading: false,
      loadError: null,
    })

    renderApp('/inventory/all?tab=low-stock')

    expect(screen.getByText('Redirecting to Accounts...')).toBeInTheDocument()
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(
        '/accounts/onboarding?returnTo=%2Finventory%2Fall%3Ftab%3Dlow-stock',
      )
    })
    expect(screen.queryByText('Protected app UI')).not.toBeInTheDocument()
  })

  it('does not redirect when company loading fails', () => {
    mockUseCompany.mockReturnValue({
      companies: [],
      isLoading: false,
      loadError: new Error('load failed'),
    })

    renderApp()

    expect(screen.getByText('Protected app UI')).toBeInTheDocument()
    expect(assignMock).not.toHaveBeenCalled()
  })
})
