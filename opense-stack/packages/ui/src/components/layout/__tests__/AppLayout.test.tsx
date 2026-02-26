import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { AppLayout } from '../AppLayout'

describe('AppLayout mobile sidebar toggle', () => {
  it('renders top bar mobile toggle when mobile sidebar is enabled', () => {
    render(
      <AppLayout
        sidebar={<div>Sidebar</div>}
        mobileSidebar={{
          enabled: true,
          isOpen: false,
          onOpen: vi.fn(),
          toggleAriaLabel: 'Toggle side navigation',
        }}
      >
        <div>Content</div>
      </AppLayout>,
    )

    expect(screen.getByRole('button', { name: 'Toggle side navigation' })).toBeInTheDocument()
  })

  it('invokes onOpen when toggle button is clicked while closed', async () => {
    const user = userEvent.setup()
    const onOpen = vi.fn()

    render(
      <AppLayout
        sidebar={<div>Sidebar</div>}
        mobileSidebar={{
          enabled: true,
          isOpen: false,
          onOpen,
          toggleAriaLabel: 'Toggle side navigation',
        }}
      >
        <div>Content</div>
      </AppLayout>,
    )

    await user.click(screen.getByRole('button', { name: 'Toggle side navigation' }))
    expect(onOpen).toHaveBeenCalledTimes(1)
  })

  it('invokes onClose when mobile backdrop is clicked', async () => {
    const user = userEvent.setup()
    const onClose = vi.fn()

    render(
      <AppLayout
        sidebar={<div>Sidebar</div>}
        mobileSidebar={{
          enabled: true,
          isOpen: true,
          onOpen: vi.fn(),
          onClose,
        }}
      >
        <div>Content</div>
      </AppLayout>,
    )

    await user.click(screen.getByRole('button', { name: 'Close side navigation' }))
    expect(onClose).toHaveBeenCalledTimes(1)
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
