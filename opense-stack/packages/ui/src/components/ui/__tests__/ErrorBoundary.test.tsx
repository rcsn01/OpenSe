import { render, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ErrorBoundary } from '../ErrorBoundary'

const ThrowingComponent = ({ shouldThrow }: { shouldThrow: boolean }) => {
  if (shouldThrow) {
    throw new Error('Render failed')
  }

  return <div>Recovered app</div>
}

describe('ErrorBoundary', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders a recoverable fallback and reports render errors', async () => {
    const user = userEvent.setup()
    const onError = vi.fn()
    const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
    let shouldThrow = true

    const { rerender } = render(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Something went wrong')
    expect(screen.queryByText('Render failed')).not.toBeInTheDocument()
    expect(onError).toHaveBeenCalledTimes(1)

    shouldThrow = false
    rerender(
      <ErrorBoundary onError={onError}>
        <ThrowingComponent shouldThrow={shouldThrow} />
      </ErrorBoundary>,
    )
    await user.click(screen.getByRole('button', { name: 'Try again' }))

    expect(screen.getByText('Recovered app')).toBeInTheDocument()
    consoleError.mockRestore()
  })

  it('supports a custom fallback renderer', () => {
    vi.spyOn(console, 'error').mockImplementation(() => {})

    render(
      <ErrorBoundary
        fallback={({ error }) => (
          <div role="alert">Custom: {error.message}</div>
        )}
      >
        <ThrowingComponent shouldThrow={true} />
      </ErrorBoundary>,
    )

    expect(screen.getByRole('alert')).toHaveTextContent('Custom: Render failed')
  })
})
