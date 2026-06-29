import { describe, expect, it, vi } from 'vitest';
import { fireEvent, render, screen } from '@testing-library/react';
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom';
import { OrganisationPage } from '../pages/OrganisationPage';

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => ({
    user: { id: 'user-1' },
  }),
}));

vi.mock('../hooks/queries/useOrganisations', () => ({
  useUserOrganisations: () => ({
    data: [
      {
        id: 'org-1',
        name: 'Acme Org',
        owner_id: 'user-1',
      },
    ],
    isLoading: false,
  }),
  useOrganisationMembers: () => ({
    data: [
      {
        id: 'member-1',
        user_id: 'user-1',
        role: 'admin',
        profiles: { email: 'owner@example.com', full_name: 'Owner' },
      },
    ],
    isLoading: false,
    refetch: vi.fn().mockResolvedValue(undefined),
  }),
}));

const renderOrganisationPage = (initialPath = '/organisation/team') => {
  return render(
    <MemoryRouter initialEntries={[initialPath]}>
      <Routes>
        <Route element={<Outlet context={{ currentOrg: null }} />}>
          <Route path="/organisation" element={<OrganisationPage />}>
            <Route path="team" element={<div>Teams content</div>} />
            <Route path="permissions" element={<div>Permissions content</div>} />
            <Route path="usage" element={<div>Usage content</div>} />
            <Route path="logs" element={<div>Logs content</div>} />
          </Route>
        </Route>
      </Routes>
    </MemoryRouter>,
  );
};

describe('OrganisationPage', () => {
  it('renders teams, permissions, usage and logs tabs', () => {
    renderOrganisationPage();

    expect(screen.getByRole('tab', { name: /teams/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /permissions/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^usage$/i })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: /^logs$/i })).toBeInTheDocument();
  });

  it('navigates from teams to permissions tab content', () => {
    renderOrganisationPage('/organisation/team');

    expect(screen.getByText('Teams content')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('tab', { name: /permissions/i }));

    expect(screen.getByText('Permissions content')).toBeInTheDocument();
  });
});
