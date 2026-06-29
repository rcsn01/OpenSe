import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import {
  AppPageShell,
  APP_PAGE_SHELL_CONTAINER_CLASS_NAME,
  APP_PAGE_SHELL_CONTENT_CLASS_NAME,
} from '../AppPageShell'

describe('AppPageShell', () => {
  it('applies shared default gutters and container spacing', () => {
    const { container } = render(
      <AppPageShell>
        <div>Page content</div>
      </AppPageShell>,
    )

    const shell = container.querySelector('.app-page-shell')
    expect(shell).toHaveClass(...APP_PAGE_SHELL_CONTENT_CLASS_NAME.split(' '))
    expect(screen.getByText('Page content').parentElement).toHaveClass(
      ...APP_PAGE_SHELL_CONTAINER_CLASS_NAME.split(' '),
    )
  })

  it('renders loading and empty states instead of children', () => {
    const { rerender } = render(
      <AppPageShell isLoading loadingMessage="Loading records...">
        <div>Hidden content</div>
      </AppPageShell>,
    )

    expect(screen.getByText('Loading records...')).toBeInTheDocument()
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()

    rerender(
      <AppPageShell emptyState={{ title: 'No records', description: 'Create one first.' }}>
        <div>Hidden content</div>
      </AppPageShell>,
    )

    expect(screen.getByText('No records')).toBeInTheDocument()
    expect(screen.getByText('Create one first.')).toBeInTheDocument()
    expect(screen.queryByText('Hidden content')).not.toBeInTheDocument()
  })
})
