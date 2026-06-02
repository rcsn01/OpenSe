/**
 * @vitest-environment jsdom
 */
import { cleanup, render, screen, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { afterEach, describe, expect, it, vi } from 'vitest'
import App from './App'

const mocks = vi.hoisted(() => ({
  configuredRender: vi.fn(),
}))

vi.mock('./ConfiguredAccountsApp', () => ({
  default: () => {
    mocks.configuredRender()
    return <div>Configured Accounts App</div>
  },
}))

const setRuntimeConfig = (config: Record<string, string>) => {
  window.__OPENSE_CONFIG__ = config
}

describe('Accounts wrapper bootstrap', () => {
  afterEach(() => {
    cleanup()
    vi.clearAllMocks()
    window.__OPENSE_CONFIG__ = {}
  })

  it('renders wrapper setup without loading the configured Accounts app when Supabase config is missing', () => {
    setRuntimeConfig({
      VITE_OPENSE_RUNTIME_TARGET: 'desktop',
      VITE_ACCOUNTS_ROUTER_BASENAME: '/accounts',
    })

    render(
      <MemoryRouter initialEntries={['/setup']}>
        <App />
      </MemoryRouter>,
    )

    expect(screen.getByRole('heading', { name: 'Connect to Instance' })).toBeTruthy()
    expect(mocks.configuredRender).not.toHaveBeenCalled()
  })

  it('redirects unconfigured mobile root launches to setup', async () => {
    setRuntimeConfig({
      VITE_OPENSE_RUNTIME_TARGET: 'mobile',
      VITE_ACCOUNTS_ROUTER_MODE: 'hash',
    })

    render(
      <MemoryRouter initialEntries={['/']}>
        <App />
      </MemoryRouter>,
    )

    await waitFor(() => {
      expect(screen.getByRole('heading', { name: 'Connect to Instance' })).toBeTruthy()
    })
    expect(mocks.configuredRender).not.toHaveBeenCalled()
  })

  it('lazy-loads the configured Accounts app when wrapper runtime has Supabase config', async () => {
    setRuntimeConfig({
      VITE_OPENSE_RUNTIME_TARGET: 'desktop',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_key',
    })

    render(
      <MemoryRouter initialEntries={['/login']}>
        <App />
      </MemoryRouter>,
    )

    await screen.findByText('Configured Accounts App')
    expect(mocks.configuredRender).toHaveBeenCalled()
  })
})
