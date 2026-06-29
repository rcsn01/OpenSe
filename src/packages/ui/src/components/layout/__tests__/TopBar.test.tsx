import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import { TopBar } from '../TopBar'

describe('TopBar search behavior', () => {
  it('uses the shared top-bar height token', () => {
    const { container } = render(<TopBar right={<div>Actions</div>} />)

    expect(container.querySelector('.app-top-bar')).toHaveClass(
      'h-[var(--app-top-bar-height)]',
      'min-h-[var(--app-top-bar-height)]',
    )
  })

  it('clears the search input from the clear button', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()

    render(
      <TopBar
        searchPlaceholder="Search alerts..."
        searchValue="scanner"
        onSearchChange={onSearchChange}
        right={<div>Actions</div>}
      />,
    )

    await user.click(screen.getByRole('button', { name: 'Clear search' }))

    expect(onSearchChange).toHaveBeenCalledWith('')
  })

  it('clears the search input when Escape is pressed', async () => {
    const user = userEvent.setup()
    const onSearchChange = vi.fn()

    render(
      <TopBar
        searchPlaceholder="Search alerts..."
        searchValue="scanner"
        onSearchChange={onSearchChange}
        right={<div>Actions</div>}
      />,
    )

    await user.type(screen.getByRole('searchbox', { name: 'Search alerts...' }), '{Escape}')

    expect(onSearchChange).toHaveBeenCalledWith('')
  })
})
