import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from '../ThemeProvider'

const cookieKey = 'opense-theme'
const storageKey = 'opense-theme'

const ThemeProbe = () => {
  const { resolvedTheme, setTheme } = useTheme()

  return (
    <>
      <div data-testid="resolved-theme">{resolvedTheme}</div>
      <button type="button" onClick={() => setTheme('dark')}>
        Enable dark mode
      </button>
    </>
  )
}

describe('ThemeProvider', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    document.cookie = `${cookieKey}=; Max-Age=0; Path=/`
    window.localStorage.clear()

    Object.defineProperty(window, 'matchMedia', {
      writable: true,
      value: vi.fn().mockImplementation(() => ({
        matches: false,
        media: '(prefers-color-scheme: dark)',
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      })),
    })
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('prefers the shared cookie over app-local storage and syncs local storage', async () => {
    document.cookie = `${cookieKey}=dark; Path=/`
    window.localStorage.setItem(storageKey, 'light')

    render(
      <ThemeProvider storageKey={storageKey} cookieKey={cookieKey}>
        <ThemeProbe />
      </ThemeProvider>,
    )

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    })

    expect(window.localStorage.getItem(storageKey)).toBe('dark')
    expect(document.documentElement.classList.contains('dark')).toBe(true)
  })

  it('persists theme changes to both local storage and the shared cookie', async () => {
    const user = userEvent.setup()

    render(
      <ThemeProvider storageKey={storageKey} cookieKey={cookieKey}>
        <ThemeProbe />
      </ThemeProvider>,
    )

    await user.click(screen.getByRole('button', { name: /enable dark mode/i }))

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    })

    expect(window.localStorage.getItem(storageKey)).toBe('dark')
    expect(document.cookie).toContain(`${cookieKey}=dark`)
  })

  it('updates when the shared cookie changes and the window regains focus', async () => {
    render(
      <ThemeProvider storageKey={storageKey} cookieKey={cookieKey}>
        <ThemeProbe />
      </ThemeProvider>,
    )

    expect(screen.getByTestId('resolved-theme')).toHaveTextContent('light')

    document.cookie = `${cookieKey}=dark; Path=/`
    window.dispatchEvent(new Event('focus'))

    await waitFor(() => {
      expect(screen.getByTestId('resolved-theme')).toHaveTextContent('dark')
    })

    expect(window.localStorage.getItem(storageKey)).toBe('dark')
  })
})