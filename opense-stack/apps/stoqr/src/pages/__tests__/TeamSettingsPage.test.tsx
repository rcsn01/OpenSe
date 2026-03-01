import { fireEvent, render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TeamSettingsPage } from '../TeamSettingsPage'

const mockUpdateCompanyMemberRole = vi.fn()

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
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
  MembersTab: ({ onRoleChange }: { onRoleChange: (memberId: string, roleId: string) => Promise<void> }) => (
    <button type="button" onClick={() => void onRoleChange('member-1', 'role-2')}>
      Trigger role change
    </button>
  ),
}))

vi.mock('../../components/TeamSettings/RolesTab', () => ({
  RolesTab: () => <div>Roles tab</div>,
}))

vi.mock('../../components/TeamSettings/ActivityLogsTab', () => ({
  ActivityLogsTab: () => <div>Activity tab</div>,
}))

vi.mock('../../components/TeamSettings/TwoFactorTab', () => ({
  TwoFactorTab: () => <div>2FA tab</div>,
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
    expect(screen.queryByText('User Management')).not.toBeInTheDocument()
    expect(screen.queryByText('RBAC')).not.toBeInTheDocument()
  })

  it('updates member role from teams tab action', async () => {
    mockUpdateCompanyMemberRole.mockResolvedValue(undefined)

    render(
      <MemoryRouter initialEntries={['/settings/organisations/teams']}>
        <Routes>
          <Route path="/settings/organisations/:tab" element={<TeamSettingsPage />} />
        </Routes>
      </MemoryRouter>,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Trigger role change' }))

    expect(mockUpdateCompanyMemberRole).toHaveBeenCalledWith({ memberId: 'member-1', roleId: 'role-2' })
  })
})
