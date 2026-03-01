import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it, vi } from 'vitest'
import { TeamSettingsPage } from '../TeamSettingsPage'

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/BasePage', () => ({
  BasePage: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../components/Tabs', () => ({
  Tabs: ({ tabs }: { tabs: Array<{ label: string; content: React.ReactNode }> }) => (
    <div>
      {tabs.map((tab) => (
        <div key={tab.label}>{tab.label}</div>
      ))}
    </div>
  ),
}))

vi.mock('../../components/TeamSettings/MembersTab', () => ({
  MembersTab: () => <div>Members tab</div>,
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
  useUpdateCompanyMemberRole: () => ({ mutateAsync: vi.fn() }),
  useUpdateRoleWithPermissions: () => ({ mutateAsync: vi.fn() }),
  useCreateRoleWithPermissions: () => ({ mutateAsync: vi.fn() }),
}))

describe('TeamSettingsPage', () => {
  it('renders renamed tabs for organisations area', () => {
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
})
