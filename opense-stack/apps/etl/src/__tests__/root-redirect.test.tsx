import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { RootRedirect } from '../RootRedirect';

const mockUseAuth = vi.fn();

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}));

const renderRootRedirect = () =>
  render(
    <MemoryRouter initialEntries={['/']}>
      <Routes>
        <Route path="/" element={<RootRedirect />} />
        <Route path="/dashboard" element={<div>Dashboard destination</div>} />
        <Route path="/login" element={<div>Login destination</div>} />
      </Routes>
    </MemoryRouter>,
  );

describe('RootRedirect', () => {
  beforeEach(() => {
    mockUseAuth.mockReset();
  });

  it('redirects authenticated users to the dashboard', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: { user: { id: 'user-1' } },
      user: { id: 'user-1' },
    });

    renderRootRedirect();

    expect(screen.getByText('Dashboard destination')).toBeInTheDocument();
  });

  it('redirects guests to the login page', () => {
    mockUseAuth.mockReturnValue({
      loading: false,
      session: null,
      user: null,
    });

    renderRootRedirect();

    expect(screen.getByText('Login destination')).toBeInTheDocument();
  });

  it('shows a loading state while auth resolves', () => {
    mockUseAuth.mockReturnValue({
      loading: true,
      session: null,
      user: null,
    });

    renderRootRedirect();

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });
});
