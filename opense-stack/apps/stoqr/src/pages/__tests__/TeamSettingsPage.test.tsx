import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Outlet, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TopBarSearchContent, TopBarSearchProvider } from '../../components/Search/TopBarSearch'
import { TeamSettingsPage } from '../TeamSettingsPage'

const mockUpdateCompanyMemberRole = vi.fn()

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => ({ user: { id: 'user-1' } }),
}))

vi.mock('../../hooks/queries/usePermissions', () => ({
  useMyPermissions: () => ({
    data: ['organisation.view', 'organisation.members.manage', 'organisation.roles.manage', 'organisation.pages.manage'],
    isLoading: false,
  }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../components/Tabs', () => ({
  Tabs: ({
    tabs,
    activeTab,
  }: {
    tabs: Array<{ id: string; label: string; content: React.ReactNode }>
    activeTab?: string
  }) => (
    <div>
      {tabs.map((tab) => (
        <div key={tab.label}>{tab.label}</div>
      ))}
      <div>{tabs.find((tab) => tab.id === activeTab)?.content ?? null}</div>
    </div>
  ),
}))

vi.mock('../../components/TeamSettings/MembersTab', () => ({
  MembersTab: ({
    onRoleChange,
    searchTerm,
  }: {
    onRoleChange: (memberId: string, roleId: string) => Promise<void>
    searchTerm?: string
  }) => (
    <>
      <button type="button" onClick={() => void onRoleChange('member-1', 'role-2')}>
        Trigger role change
      </button>
      <div>Members tab {searchTerm}</div>
    </>
  ),
}))

vi.mock('../../components/TeamSettings/RolesTab', () => ({
  RolesTab: ({ searchTerm }: { searchTerm?: string }) => <div>Roles tab {searchTerm}</div>,
}))

vi.mock('../../components/TeamSettings/ActivityLogsTab', () => ({
  ActivityLogsTab: ({ searchTerm }: { searchTerm?: string }) => <div>Activity tab {searchTerm}</div>,
}))

vi.mock('../../components/TeamSettings/PagesTab', () => ({
  PagesTab: ({ searchTerm }: { searchTerm?: string }) => <div>Pages tab {searchTerm}</div>,
}))

vi.mock('../../components/TeamSettings/TwoFactorTab', () => ({
  TwoFactorTab: ({ searchTerm }: { searchTerm?: string }) => <div>2FA tab {searchTerm}</div>,
}))

vi.mock('../../hooks/queries/useOrganisationPageSettings', () => ({
  useOrganisationPageSettings: () => ({
    data: {
      reportsEnabled: true,
      procurementEnabled: true,
      alertsEnabled: true,
    },
    isLoading: false,
  }),
  useUpdateOrganisationPageSettings: () => ({
    isPending: false,
    mutateAsync: vi.fn(),
  }),
}))

vi.mock('../../hooks/queries/useTeamSettings', () => ({
  useTeamSettingsData: () => ({
    data: {
      members: [],
      invitations: [],
      roles: [],
      permissions: [],
      rolePermissions: {},
    },
    isLoading: false,
  }),
  useTeamActivityEvents: () => ({ data: [], isLoading: false }),
  useInviteCompanyMember: () => ({ mutateAsync: vi.fn() }),
  useUpdateCompanyMemberRole: () => ({ mutateAsync: mockUpdateCompanyMemberRole }),
  useUpdateRoleWithPermissions: () => ({ mutateAsync: vi.fn() }),
  useCreateRoleWithPermissions: () => ({ mutateAsync: vi.fn() }),
}))

describe('TeamSettingsPage', () => {
  const SearchShell = () => (
    <TopBarSearchProvider>
      <TopBarSearchContent />
      <Outlet />
    </TopBarSearchProvider>
  )

  it('renders renamed tabs for organisations area', () => {
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/settings/organisations/teams']}>
        <Routes>
          <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    expect(screen.getByText('Teams')).toBeInTheDocument()
    expect(screen.getByText('Permissions')).toBeInTheDocument()
    expect(screen.getByText('Pages')).toBeInTheDocument()
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    expect(screen.queryByText('RBAC')).not.toBeInTheDocument()
  })

  it('updates member role from teams tab action', async () => {
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/settings/organisations/teams']}>
        <Routes>
          <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    await user.click(screen.getByRole('button', { name: 'Trigger role change' }))

    expect(mockUpdateCompanyMemberRole).toHaveBeenCalledWith({ memberId: 'member-1', roleId: 'role-2' })
  })

  it('shows the shared top-bar search on the teams tab and passes the term into members', async () => {
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/settings/organisations/teams']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search team members...' }), 'alex')

    expect(screen.getByText('Members tab alex')).toBeInTheDocument()
  })

  it('passes the shared top-bar search term into activity logs', async () => {
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)
    const user = userEvent.setup()

    render(
      <MemoryRouter initialEntries={['/settings/organisations/activity']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search activity logs...' }), 'permission change')

    expect(screen.getByText('Activity tab permission change')).toBeInTheDocument()
  })

  it('passes the shared top-bar search term into permissions', async () => {
    const user = userEvent.setup()
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/settings/organisations/permissions']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search roles and permissions...' }), 'approver')

    expect(screen.getByText('Roles tab approver')).toBeInTheDocument()
  })

  it('passes the shared top-bar search term into page access controls', async () => {
    const user = userEvent.setup()
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/settings/organisations/pages']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search page access...' }), 'procurement')

    expect(screen.getByText('Pages tab procurement')).toBeInTheDocument()
  })

  it('passes the shared top-bar search term into two-factor settings', async () => {
    const user = userEvent.setup()
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/settings/organisations/two-factor']}>
        <Routes>
          <Route element={<SearchShell />}>
            <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
          </Route>
        </Routes>
      </MemoryRouter>,
    )

    await user.type(screen.getByRole('combobox', { name: 'Search two-factor...' }), 'verified')

    expect(screen.getByText('2FA tab verified')).toBeInTheDocument()
  })
})
