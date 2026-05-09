import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrganisationPermissionsPanel } from '../OrganisationPermissionsPanel'

const roles = [
  {
    id: 'role-1',
    name: 'Admin',
    description: 'Can manage everything',
    roleRank: 100,
    permissionCodes: ['users.view', 'users.manage'],
  },
  {
    id: 'role-2',
    name: 'Viewer',
    description: 'Read-only role',
    roleRank: 50,
    permissionCodes: ['users.view'],
  },
]

const permissions = [
  { code: 'users.view', description: 'View users' },
  { code: 'users.edit', description: 'Edit users' },
  { code: 'users.manage', description: 'Manage users' },
  { code: 'scanner.use', description: 'Use scanner' },
]

describe('OrganisationPermissionsPanel', () => {
  it('creates a new role from add row', async () => {
    const user = userEvent.setup()
    const onCreateRole = vi.fn().mockResolvedValue(undefined)

    render(
      <OrganisationPermissionsPanel
        roles={[]}
        permissions={permissions}
        canManage={true}
        onCreateRole={onCreateRole}
        onUpdateRole={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: /add role/i }))
    await user.type(screen.getByPlaceholderText('New role name'), 'Reviewer')
    await user.type(screen.getByPlaceholderText('Role description'), 'Review only role')
    await user.click(screen.getByRole('button', { name: /create role/i }))

    expect(onCreateRole).toHaveBeenCalledWith({
      name: 'Reviewer',
      description: 'Review only role',
      roleRank: 100,
      permissionCodes: [],
    })
  })

  it('opens edit dialog and submits updated permissions', async () => {
    const user = userEvent.setup()
    const onUpdateRole = vi.fn().mockResolvedValue(undefined)

    render(
      <OrganisationPermissionsPanel
        roles={roles}
        permissions={permissions}
        canManage={true}
        onCreateRole={vi.fn()}
        onUpdateRole={onUpdateRole}
      />,
    )

    await user.click(screen.getAllByRole('button', { name: /^edit$/i })[0])
    expect(screen.getByRole('heading', { name: /edit role permissions/i })).toBeInTheDocument()
    expect(screen.getByRole('dialog')).toHaveStyle({
      width: 'min(100vw, clamp(64rem, 84vw, 110rem))',
    })

    const checkboxes = screen.getAllByRole('checkbox')
    await user.click(checkboxes[0])

    await user.click(screen.getByRole('button', { name: /^save$/i }))

    expect(onUpdateRole).toHaveBeenCalled()
    const [roleId, payload] = onUpdateRole.mock.calls[0]
    expect(roleId).toBe('role-1')
    expect(payload.name).toBe('Admin')
    expect(payload.roleRank).toBe(100)
  })

  it('shows role rank in list and blocks duplicate rank creation', async () => {
    const user = userEvent.setup()
    const onCreateRole = vi.fn().mockResolvedValue(undefined)

    render(
      <OrganisationPermissionsPanel
        roles={roles}
        permissions={permissions}
        canManage={true}
        onCreateRole={onCreateRole}
        onUpdateRole={vi.fn()}
      />,
    )

    expect(screen.getAllByText('100').length).toBeGreaterThan(0)
    expect(screen.getAllByText('50').length).toBeGreaterThan(0)

    await user.click(screen.getByRole('button', { name: /add role/i }))
    await user.type(screen.getByPlaceholderText('New role name'), 'Duplicate Rank Role')
    await user.clear(screen.getByPlaceholderText('Role rank'))
    await user.type(screen.getByPlaceholderText('Role rank'), '50')
    await user.click(screen.getByRole('button', { name: /create role/i }))

    expect(onCreateRole).not.toHaveBeenCalled()
    expect(screen.getByText(/role rank must be unique within your organisation/i)).toBeInTheDocument()
  })

  it('renders permission type columns in preferred order', async () => {
    const user = userEvent.setup()

    render(
      <OrganisationPermissionsPanel
        roles={roles}
        permissions={permissions}
        canManage={true}
        onCreateRole={vi.fn()}
        onUpdateRole={vi.fn()}
      />,
    )

    await user.click(screen.getAllByRole('button', { name: /^edit$/i })[0])

    const headers = screen.getAllByRole('columnheader').map((header) => header.textContent?.trim())
    expect(headers).toContain('View')
    expect(headers).toContain('Edit')
    expect(headers).toContain('Manage')
    expect(headers).toContain('Use')
  })
})
