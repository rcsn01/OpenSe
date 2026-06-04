import { render, screen, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { ProfileDropdown } from '../ProfileDropdown'

describe('ProfileDropdown', () => {
  it('renders Profile, Settings, and Log out in order when handlers exist', async () => {
    const user = userEvent.setup()

    render(
      <ProfileDropdown
        profileFallback="JL"
        onProfileClick={vi.fn()}
        onSettingsClick={vi.fn()}
        onLogout={vi.fn()}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))

    const menuItems = screen.getAllByRole('button').filter((button) =>
      ['Profile', 'Settings', 'Log out'].includes(button.textContent ?? ''),
    )
    expect(menuItems.map((item) => item.textContent)).toEqual(['Profile', 'Settings', 'Log out'])
  })

  it('hides missing handler items', async () => {
    const user = userEvent.setup()

    render(<ProfileDropdown profileFallback="JL" onSettingsClick={vi.fn()} />)

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))

    expect(screen.queryByRole('button', { name: 'Profile' })).not.toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Settings' })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Log out' })).not.toBeInTheDocument()
  })

  it('does not render an empty dropdown trigger when no items are visible', () => {
    render(<ProfileDropdown profileFallback="JL" />)

    expect(screen.queryByRole('button', { name: 'Open profile menu' })).not.toBeInTheDocument()
    expect(screen.getByText('JL')).toBeInTheDocument()
  })

  it('calls the matching handler for each menu item', async () => {
    const user = userEvent.setup()
    const onProfileClick = vi.fn()
    const onSettingsClick = vi.fn()
    const onLogout = vi.fn()

    render(
      <ProfileDropdown
        profileFallback="JL"
        onProfileClick={onProfileClick}
        onSettingsClick={onSettingsClick}
        onLogout={onLogout}
      />,
    )

    const trigger = screen.getByRole('button', { name: 'Open profile menu' })

    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Profile' }))
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Settings' }))
    await user.click(trigger)
    await user.click(screen.getByRole('button', { name: 'Log out' }))

    expect(onProfileClick).toHaveBeenCalledTimes(1)
    expect(onSettingsClick).toHaveBeenCalledTimes(1)
    expect(onLogout).toHaveBeenCalledTimes(1)
  })

  it('keeps custom children before standard menu items', async () => {
    const user = userEvent.setup()

    render(
      <ProfileDropdown profileFallback="JL" onProfileClick={vi.fn()}>
        <button type="button">Custom</button>
      </ProfileDropdown>,
    )

    await user.click(screen.getByRole('button', { name: 'Open profile menu' }))

    const dropdown = screen.getByText('Custom').closest('div')
    expect(dropdown ? within(dropdown).getByRole('button', { name: 'Custom' }) : null).toBeTruthy()
  })
})
