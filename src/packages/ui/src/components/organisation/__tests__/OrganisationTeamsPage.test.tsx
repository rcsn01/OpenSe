import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrganisationTeamsPage } from '../OrganisationTeamsPage'
import { OrganisationTeamsTab } from '../OrganisationTeamsTab'

describe('OrganisationTeamsPage', () => {
  it('renders the shared role dropdown and notifies on selection', async () => {
    const user = userEvent.setup()
    const onFilterChange = vi.fn()

    render(
      <OrganisationTeamsPage
        filterValue="all"
        onFilterChange={onFilterChange}
        filterOptions={[
          { value: 'all', label: 'All' },
          { value: 'manager', label: 'Manager' },
          { value: 'member', label: 'Member' },
        ]}
        canManageTeam
        onInviteClick={() => {}}
        tableContent={<div>Team table</div>}
      />,
    )

    expect(screen.getByRole('button', { name: 'Team role filter' })).toHaveTextContent('All')
    expect(screen.getByRole('button', { name: 'Actions' })).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'Team role filter' }))
    await user.click(screen.getByRole('button', { name: 'Manager' }))

    expect(onFilterChange).toHaveBeenCalledWith('manager')
  })

  it('renders team filter and invite action inside the members table top row', async () => {
    const user = userEvent.setup()
    const onInvite = vi.fn()

    render(
      <OrganisationTeamsTab
        members={[
          {
            id: 'member-1',
            displayName: 'Alex Manager',
            subtitle: 'alex@example.com',
            roleId: 'manager',
          },
          {
            id: 'member-2',
            displayName: 'Mina Member',
            subtitle: 'mina@example.com',
            roleId: 'member',
          },
        ]}
        roles={[
          { id: 'manager', name: 'Manager' },
          { id: 'member', name: 'Member' },
        ]}
        canManageTeam
        onRoleChange={vi.fn()}
        onInvite={onInvite}
      />,
    )

    const filterButton = screen.getByRole('button', { name: 'Team role filter' })
    const inviteButton = screen.getByRole('button', { name: 'Invite Members' })

    expect(filterButton.closest('.data-table-top-row')).not.toBeNull()
    expect(inviteButton.closest('.data-table-top-row')).not.toBeNull()

    await user.click(filterButton)
    await user.click(screen.getByRole('button', { name: 'Member' }))

    expect(screen.getByText('Mina Member')).toBeInTheDocument()
    expect(screen.queryByText('Alex Manager')).not.toBeInTheDocument()

    await user.click(inviteButton)

    expect(screen.getByRole('heading', { name: 'Invite Team Member' })).toBeInTheDocument()
  })
})
