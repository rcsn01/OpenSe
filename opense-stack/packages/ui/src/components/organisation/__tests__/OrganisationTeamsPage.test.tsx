import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { OrganisationTeamsPage } from '../OrganisationTeamsPage'

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
})