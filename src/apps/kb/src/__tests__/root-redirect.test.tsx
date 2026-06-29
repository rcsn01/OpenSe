import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RootRedirect } from '../App'

const mockUseAuth = vi.fn()

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}))

vi.mock('@repo/shared/auth', () => ({
  AuthRedirectPage: () => <div>Auth redirect page</div>,
}))

vi.mock('@repo/shared/supabase', () => ({
  supabase: {
    schema: () => ({}),
  },
}))

const renderRootRedirect = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/home" element={<div>Home destination</div>} />
        <Route path="/auth" element={<div>Auth destination</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('RootRedirect', () => {
  beforeEach(() => {
    mockUseAuth.mockReset()
  })

  it('redirects authenticated users to home', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      user: { id: 'user-1' },
    })

    renderRootRedirect()

    expect(screen.getByText('Home destination')).toBeInTheDocument()
  })

  it('redirects guests to auth', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      user: null,
    })

    renderRootRedirect()

    expect(screen.getByText('Auth destination')).toBeInTheDocument()
  })

  it('shows the loading state while the session resolves', () => {
    mockUseAuth.mockReturnValue({
      loading: true,
      user: null,
    })

    renderRootRedirect()

    expect(screen.getByText('Loading session...')).toBeInTheDocument()
  })
})
