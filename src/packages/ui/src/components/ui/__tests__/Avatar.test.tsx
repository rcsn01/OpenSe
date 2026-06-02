import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { Avatar } from '../Avatar'

describe('Avatar', () => {
  it('uses the primary fallback token colors when no image is provided', () => {
    render(<Avatar fallback="JD" alt="Jane Doe" />)

    const fallbackAvatar = screen.getByText('JD').parentElement

    expect(fallbackAvatar).toHaveClass('bg-[var(--color-avatar-background)]')
    expect(fallbackAvatar).toHaveClass('text-[var(--color-avatar-foreground)]')
  })

  it('renders the provided image source when available', () => {
    render(<Avatar src="/avatar.png" alt="Jane Doe" fallback="JD" />)

    expect(screen.getByRole('img', { name: 'Jane Doe' })).toHaveAttribute('src', '/avatar.png')
    expect(screen.queryByText('JD')).not.toBeInTheDocument()
  })
})