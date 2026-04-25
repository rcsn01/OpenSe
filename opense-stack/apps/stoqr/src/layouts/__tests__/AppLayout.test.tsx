import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
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

vi.mock('@repo/shared/utils', () => ({
  buildAccountsSettingsUrl: () => '/accounts/settings',
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

const renderRoute = (initialEntry: string) =>
  render(
    <MemoryRouter initialEntries={[initialEntry]}>
      <Routes>
        <Route element={<AppLayout />}>
          <Route path="/dashboard" element={<div>Dashboard</div>} />
          <Route path="/alerts/:tab" element={<div>Alerts</div>} />
        </Route>
      </Routes>
    </MemoryRouter>,
  )

describe('AppLayout', () => {
  beforeEach(() => {
    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: mockMatchMedia(false),
    })
  })

  it('uses the alerts placeholder on alerts routes', () => {
    renderRoute('/alerts/feed')

    expect(screen.getByPlaceholderText('Search alerts...')).toBeInTheDocument()
  })

  it('uses the generic placeholder on non-alert routes', () => {
    renderRoute('/dashboard')

    expect(screen.getByPlaceholderText('Search items...')).toBeInTheDocument()
  })
})