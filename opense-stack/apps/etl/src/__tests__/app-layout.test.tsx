import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../layouts/AppLayout'

const mockUseAuth = vi.fn()
const mockUseUserOrganisations = vi.fn()
const assignMock = vi.fn()

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@repo/ui', () => ({
  AppShellLayout: ({ children }: { children: ReactNode }) => (
    <div>
      <div>Protected app UI</div>
      {children}
    </div>
  ),
}))

vi.mock('../hooks/queries/useOrganisations', () => ({
  useUserOrganisations: (...args: unknown[]) => mockUseUserOrganisations(...args),
}))

vi.mock('../components/Search/TopBarSearch', () => ({
  TopBarSearchContent: () => null,
  TopBarSearchProvider: ({ children }: { children: ReactNode }) => <>{children}</>,
}))

vi.mock('../lib/authRedirect', () => ({
  buildAccountsOnboardingUrl: (redirectPath?: string) =>
    `/accounts/onboarding?returnTo=${encodeURIComponent(redirectPath ?? '')}`,
  buildAccountsSettingsUrl: () => '/accounts/settings',
}))

const renderAppLayout = (initialEntry = '/dashboard') =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<div>Dashboard page</div>} />
          <Route path="/activity/:tab" element={<div>Activity page</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('AppLayout organisation guard', () => {
  beforeEach(() => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { user: { id: 'user-1' } },
      user: { id: 'user-1', email: 'user@example.com', user_metadata: {} },
      logout: vi.fn(),
    })
    mockUseUserOrganisations.mockReturnValue({
      data: [{ id: 'org-1', name: 'Acme' }],
      isLoading: false,
      isError: false,
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

  it('renders the protected app when organisations are present', () => {
    renderAppLayout()

    expect(screen.getByText('Protected app UI')).toBeInTheDocument()
    expect(screen.getByText('Dashboard page')).toBeInTheDocument()
    expect(assignMock).not.toHaveBeenCalled()
  })

  it('redirects authenticated users with no organisations to Accounts onboarding', async () => {
    mockUseUserOrganisations.mockReturnValue({
      data: [],
      isLoading: false,
      isError: false,
    })

    renderAppLayout('/activity/usage?range=7d')

    expect(screen.getByText('Redirecting to Accounts...')).toBeInTheDocument()
    await waitFor(() => {
      expect(assignMock).toHaveBeenCalledWith(
        '/accounts/onboarding?returnTo=%2Factivity%2Fusage%3Frange%3D7d',
      )
    })
    expect(screen.queryByText('Protected app UI')).not.toBeInTheDocument()
  })

  it('does not redirect when the organisation query fails', () => {
    mockUseUserOrganisations.mockReturnValue({
      data: [],
      isLoading: false,
      isError: true,
    })

    renderAppLayout()

    expect(screen.getByText('Protected app UI')).toBeInTheDocument()
    expect(assignMock).not.toHaveBeenCalled()
  })
})
