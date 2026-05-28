import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { RolePermissionsEditPage } from '../RolePermissionsEditPage'

const mockMutateAsync = vi.fn()

const teamSettingsData = {
  roles: [
    {
      id: 'role-default',
      name: 'Default',
      description: 'System-managed default role',
      role_rank: 0,
    },
    {
      id: 'role-owner',
      name: 'Owner',
      description: 'System-managed owner role',
      role_rank: 1000,
    },
  ],
  permissions: [
    {
      code: 'dashboard.view',
      description: 'View dashboard',
      page_key: 'dashboard',
      action_key: 'view',
      label: 'View',
      sort_order: 10,
      hidden: false,
      deprecated: false,
    },
    {
      code: 'reports.view',
      description: 'View reports',
      page_key: 'reports',
      action_key: 'view',
      label: 'View',
      sort_order: 20,
      hidden: false,
      deprecated: false,
    },
  ],
  rolePermissions: {
    'role-default': ['dashboard.view'],
    'role-owner': ['dashboard.view', 'reports.view'],
  },
}

vi.mock('../../contexts/CompanyContext', () => ({
  useCompany: () => ({ companyId: 'company-1' }),
}))

vi.mock('../../components/StoqrPageShell', () => ({
  StoqrPageShell: ({ children }: { children: React.ReactNode }) => <div>{children}</div>,
}))

vi.mock('../../hooks/queries/useTeamSettings', () => ({
  useTeamSettingsData: () => ({
    data: teamSettingsData,
    isLoading: false,
  }),
  useUpdateRoleWithPermissions: () => ({
    mutateAsync: mockMutateAsync,
    isPending: false,
  }),
}))

const renderPage = (roleId: string) =>
  render(
    <MemoryRouter initialEntries={[`/settings/organisations/permissions/${roleId}`]}>
      <Routes>
        <Route path="/settings/organisations/permissions/:roleId" element={<RolePermissionsEditPage />} />
        <Route path="/settings/organisations/permissions" element={<div>Permissions list</div>} />
      </Routes>
    </MemoryRouter>,
  )

describe('RolePermissionsEditPage', () => {
  beforeEach(() => {
    mockMutateAsync.mockReset()
    mockMutateAsync.mockResolvedValue(undefined)
  })

  it('keeps Default role details read-only while allowing permission edits', async () => {
    const user = userEvent.setup()
    renderPage('role-default')

    expect(screen.getByDisplayValue('Default')).toBeDisabled()
    expect(screen.getByDisplayValue('System-managed default role')).toBeDisabled()
    expect(screen.getByDisplayValue('0')).toBeDisabled()
    expect(screen.getByText(/permissions can be edited by role managers/i)).toBeInTheDocument()

    const checkboxes = screen.getAllByRole('checkbox')
    expect(checkboxes[0]).toBeChecked()
    expect(checkboxes[1]).not.toBeChecked()
    expect(checkboxes[1]).toBeEnabled()

    await user.click(checkboxes[1])
    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(mockMutateAsync).toHaveBeenCalledWith({
      roleId: 'role-default',
      name: 'Default',
      description: 'System-managed default role',
      roleRank: 0,
      permissionCodes: ['dashboard.view', 'reports.view'],
    })
    expect(screen.getByText('Permissions list')).toBeInTheDocument()
  })

  it('keeps Owner role permissions and save action read-only', () => {
    renderPage('role-owner')

    expect(screen.queryByRole('button', { name: /^save$/i })).not.toBeInTheDocument()
    expect(screen.getAllByRole('checkbox').every((checkbox) => checkbox.hasAttribute('disabled'))).toBe(true)
  })
})
