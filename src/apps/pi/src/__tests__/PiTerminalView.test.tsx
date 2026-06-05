import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ThemeProvider, useTheme } from '@repo/ui'
import { PiTerminalView } from '../components/PiTerminalView'
import type { OpenPiBridge } from '../lib/assistantBridge'

type TerminalMock = {
  options: { theme?: { background?: string } }
}

const getLatestTerminal = (): TerminalMock | undefined => {
  const instances = (globalThis as { __OPENSE_TEST_XTERM_INSTANCES?: TerminalMock[] }).__OPENSE_TEST_XTERM_INSTANCES
  return instances?.[instances.length - 1]
}

const createBridge = (): OpenPiBridge =>
  ({
    startTerminal: vi.fn(async () => ({
      id: 'terminal-1',
      status: 'running' as const,
      initialData: '',
    })),
    writeTerminal: vi.fn(async () => undefined),
    resizeTerminal: vi.fn(async () => undefined),
    stopTerminal: vi.fn(async () => undefined),
    onTerminalEvent: vi.fn(() => () => undefined),
  }) as unknown as OpenPiBridge

const ThemeSwitcher = () => {
  const { setTheme } = useTheme()
  return (
    <>
      <button type="button" onClick={() => setTheme('light')}>
        Use light theme
      </button>
      <button type="button" onClick={() => setTheme('dark')}>
        Use dark theme
      </button>
    </>
  )
}

const renderTerminal = (bridge: OpenPiBridge, theme: 'light' | 'dark' = 'light') => {
  document.documentElement.classList.toggle('dark', theme === 'dark')
  return render(
    <ThemeProvider defaultTheme={theme} storageKey="opense-theme-test" cookieKey="opense-theme-test" respectStoredTheme={false}>
      <ThemeSwitcher />
      <PiTerminalView bridge={bridge} visible />
    </ThemeProvider>,
  )
}

describe('PiTerminalView theme', () => {
  beforeEach(() => {
    document.documentElement.className = ''
    ;(globalThis as { __OPENSE_TEST_XTERM_INSTANCES?: TerminalMock[] }).__OPENSE_TEST_XTERM_INSTANCES = []
  })

  it('applies light xterm theme on mount when resolved theme is light', async () => {
    renderTerminal(createBridge(), 'light')

    await waitFor(() => {
      expect(getLatestTerminal()?.options.theme?.background).toBe('#ffffff')
    })
    expect(screen.getByTestId('pi-terminal-view')).toHaveClass('bg-[var(--color-background)]')
  })

  it('applies dark xterm theme on mount when resolved theme is dark', async () => {
    renderTerminal(createBridge(), 'dark')

    await waitFor(() => {
      expect(getLatestTerminal()?.options.theme?.background).toBe('#0d0d0d')
    })
  })

  it('updates xterm theme when app theme changes without remounting', async () => {
    const user = userEvent.setup()
    renderTerminal(createBridge(), 'dark')

    await waitFor(() => {
      expect(getLatestTerminal()?.options.theme?.background).toBe('#0d0d0d')
    })

    const terminal = getLatestTerminal()
    await user.click(screen.getByRole('button', { name: /use light theme/i }))

    await waitFor(() => {
      expect(terminal?.options.theme?.background).toBe('#ffffff')
    })
    expect((globalThis as { __OPENSE_TEST_XTERM_INSTANCES?: TerminalMock[] }).__OPENSE_TEST_XTERM_INSTANCES).toHaveLength(1)
  })
})
