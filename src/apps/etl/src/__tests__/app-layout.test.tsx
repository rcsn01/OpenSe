import { render, screen, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../layouts/AppLayout'

const mockUseAuth = vi.fn()
const mockUseUserOrganisations = vi.fn()
const appShellLayoutProps: any[] = []
const assignMock = vi.fn()

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@repo/shared/account-profile', () => ({
  useCurrentAccountProfileSummary: () => ({
    profileSrc: 'https://example.com/avatar.png',
    profileFallback: 'AU',
  }),
}))

vi.mock('@repo/shared/supabase', () => ({
  supabase: {},
}))

vi.mock('@repo/ui', () => ({
  AppShellLayout: (props: { children: ReactNode }) => {
    appShellLayoutProps.push(props)
    return (
      <div>
        <div>Protected app UI</div>
        {props.children}
      </div>
    )
  },
  SWITCHABLE_APP_ICONS: {
    etl: () => <span data-testid="etl-brand-icon" />,
  },
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
  buildAccountsProfileUrl: () => '/accounts/profile',
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
    appShellLayoutProps.length = 0
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

  it('passes account profile, settings, and logout actions into the app shell', () => {
    renderAppLayout()

    const props = appShellLayoutProps[appShellLayoutProps.length - 1] as any
    expect(props.profileSrc).toBe('https://example.com/avatar.png')
    expect(props.profileFallback).toBe('AU')
    expect(props.onProfileClick).toEqual(expect.any(Function))
    expect(props.onSettingsClick).toEqual(expect.any(Function))
    expect(props.onLogout).toEqual(expect.any(Function))

    props.onProfileClick()
    expect(assignMock).toHaveBeenCalledWith('/accounts/profile')
    props.onSettingsClick()
    expect(assignMock).toHaveBeenCalledWith('/accounts/settings')
  })
})
