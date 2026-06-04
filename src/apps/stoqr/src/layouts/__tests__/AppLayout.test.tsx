import { useMemo } from 'react'
import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { usePageTopBarSearch } from '../../components/Search/TopBarSearch'
import { AppLayout } from '../AppLayout'

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => ({
    user: {
      email: 'operator@example.com',
      user_metadata: { full_name: 'Operator' },
    },
    logout: vi.fn(),
  }),
}))

vi.mock('@repo/shared/account-profile', () => ({
  useCurrentAccountProfileSummary: () => ({
    profileSrc: 'https://example.com/avatar.png',
    profileFallback: 'OP',
  }),
}))

vi.mock('@repo/shared/supabase', () => ({
  supabase: {},
}))

vi.mock('@repo/shared/utils', () => ({
  buildAccountsSettingsUrl: () => '/accounts/settings',
  createAccountsRedirects: () => ({
    auth: () => '/accounts/auth',
    profile: () => '/accounts/profile',
    settings: () => '/accounts/settings',
    onboarding: () => '/accounts/onboarding',
  }),
}))

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../hooks/queries/usePermissions', () => ({
  useMyPermissions: () => ({
    data: [
      'dashboard.view',
      'inventory.view',
      'scanner.view',
      'labels.view',
      'reports.view',
      'procurement.view',
      'alerts.view',
      'organisation.view',
    ],
    isLoading: false,
  }),
}))

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

const SearchableStubPage = ({
  searchKey,
  placeholder,
  enabled = true,
}: {
  searchKey: string
  placeholder: string
  enabled?: boolean
}) => {
  usePageTopBarSearch(useMemo(() => ({
    searchKey,
    enabled,
    placeholder,
    defaultSuggestions: [
      {
        id: `${searchKey}-default`,
        title: `${placeholder} default`,
        value: placeholder,
        badge: 'Test',
      },
    ],
  }), [enabled, placeholder, searchKey]))

  return <div>{searchKey}</div>
}

const renderRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/plain" element={<div>Plain Page</div>} />
          <Route path="/inventory/:tab" element={<div>Inventory</div>} />
          <Route path="/scan/:tab" element={<div>Scan</div>} />
          <Route path="/tools/labels/:tab" element={<div>Label Studio</div>} />
          <Route path="/tools/labels/:tab/:templateId" element={<div>Label Designer</div>} />
          <Route path="/reports/:tab" element={<div>Reports</div>} />
          <Route path="/procurement/:tab" element={<div>Procurement</div>} />
          <Route path="/alerts/:tab" element={<div>Alerts</div>} />
          <Route path="/alerts/rules/new" element={<div>Alert Rule Editor</div>} />
          <Route path="/settings/organisations/:tab" element={<div>Organisations</div>} />
          <Route
            path="/search/items"
            element={<SearchableStubPage searchKey="search-items" placeholder="Search items..." />}
          />
          <Route
            path="/search/alerts"
            element={<SearchableStubPage searchKey="search-alerts" placeholder="Search alerts..." />}
          />
          <Route
            path="/search/disabled"
            element={<SearchableStubPage searchKey="search-disabled" placeholder="Search disabled..." enabled={false} />}
          />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('AppLayout', () => {
  const assignMock = vi.fn()

  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia(false),
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

  it('renders the registered page placeholder when a child page opts into search', () => {
    renderRoute('/search/items')

    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })

  it('updates the top-bar search placeholder based on the active page registration', () => {
    renderRoute('/search/alerts')

    expect(screen.getByPlaceholderText('Search alerts...')).toBeInTheDocument()
    expect(screen.queryByPlaceholderText('Search items...')).not.toBeInTheDocument()
  })

  it('hides the top-bar search when the active page does not register it', () => {
    renderRoute('/plain')

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('keeps the top-bar search hidden when a page registration is disabled', () => {
    renderRoute('/search/disabled')

    expect(screen.queryByRole('combobox')).not.toBeInTheDocument()
  })

  it('keeps the Label Studio nav item active on sibling tab routes', () => {
    renderRoute('/tools/labels/preview-batch')

    expect(screen.getByRole('link', { name: 'Label Studio' })).toHaveClass('bg-[var(--color-side-nav-active-bg)]')
    expect(screen.getByRole('link', { name: 'Dashboard' })).not.toHaveClass('bg-[var(--color-side-nav-active-bg)]')
  })

  it('keeps the Alerts nav item active on nested section routes', () => {
    renderRoute('/alerts/rules/new')

    expect(screen.getByRole('link', { name: 'Alerts' })).toHaveClass('bg-[var(--color-side-nav-active-bg)]')
    expect(screen.getByRole('link', { name: 'Organisations' })).not.toHaveClass('bg-[var(--color-side-nav-active-bg)]')
  })

  it('renders profile, settings, and logout menu actions from shared chrome', async () => {
    const user = userEvent.setup()
    renderRoute('/plain')

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))

    expect(screen.getByRole('button', { name: 'Profile' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Log out' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Profile' }))
    expect(assignMock).toHaveBeenCalledWith('/accounts/profile')
  })
})
