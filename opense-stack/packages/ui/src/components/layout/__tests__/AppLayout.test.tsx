import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../AppLayout'

describe('AppLayout mobile sidebar toggle', () => {
  it('renders attached sidebar toggle when mobile sidebar is enabled', () => {
    render(
      <AppLayout
        sidebar={<div>Sidebar</div>}
        mobileSidebar={{
          enabled: true,
          isOpen: false,
          onToggle: vi.fn(),
          toggleAriaLabel: 'Toggle side navigation',
        }}
      >
        <div>Content</div>
      </AppLayout>,
    )

    expect(screen.getByRole('button', { name: 'Toggle side navigation' })).toBeInTheDocument()
  })

  it('invokes onToggle when toggle button is clicked', async () => {
    const user = userEvent.setup()
    const onToggle = vi.fn()

    render(
      <AppLayout
        sidebar={<div>Sidebar</div>}
        mobileSidebar={{
          enabled: true,
          isOpen: true,
          onToggle,
          toggleAriaLabel: 'Toggle side navigation',
        }}
      >
        <div>Content</div>
      </AppLayout>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle side navigation' }))
    expect(onToggle).toHaveBeenCalledTimes(1)
  })

  it('does not render mobile toggle when mobile sidebar is disabled', () => {
    render(
      <AppLayout sidebar={<div>Sidebar</div>}>
        <div>Content</div>
      </AppLayout>,
    )

    expect(screen.queryByRole('button', { name: 'Toggle side navigation' })).not.toBeInTheDocument()
  })
})
