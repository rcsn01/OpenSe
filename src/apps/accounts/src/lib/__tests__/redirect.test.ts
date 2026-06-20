import { afterEach, describe, expect, it, vi } from 'vitest'

vi.mock('@repo/shared/auth/session-handoff', () => ({
  buildAuthHandoffUrl: async (targetUrl: string) => `${targetUrl}#handoff=true`,
}))

import {
  buildQueryString,
  getReturnToFromQuery,
  redirectBackToApp,
} from '../redirect'

const setWindowLocation = (
  search: string,
  origin = 'http://localhost:5991',
  config: Record<string, string> = {},
) => {
  const url = new URL(origin)
  const replace = vi.fn()

  vi.stubGlobal('window', {
    __OPENSE_CONFIG__: config,
    location: {
      origin,
      hostname: url.hostname,
      search,
      replace,
    },
  })

  return replace
}

const buildSearch = (returnTo: string, app = 'Open-ETL') => {
  const params = new URLSearchParams({ app, returnTo })
  return `?${params.toString()}`
}

describe('accounts redirect helpers', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('keeps first-party app return destinations', () => {
    setWindowLocation(buildSearch('http://localhost:5992/dashboard'))

    expect(getReturnToFromQuery()).toBe('http://localhost:5992/dashboard')
    expect(buildQueryString()).toBe(
      'returnTo=http%3A%2F%2Flocalhost%3A5992%2Fdashboard&app=Open-ETL',
    )
  })

  it('keeps local Open-KB return destinations', () => {
    setWindowLocation(buildSearch('http://localhost:5995/dashboard', 'Open-KB'))

    expect(getReturnToFromQuery()).toBe('http://localhost:5995/dashboard')
    expect(buildQueryString()).toBe(
      'returnTo=http%3A%2F%2Flocalhost%3A5995%2Fdashboard&app=Open-KB',
    )
  })

  it('keeps configured Open-KB return destinations', () => {
    setWindowLocation(
      buildSearch('https://open-kb.example.com/dashboard', 'Open-KB'),
      'https://accounts.example.com',
      {
        VITE_ACCOUNTS_URL: 'https://accounts.example.com',
        VITE_OPEN_KB_PUBLIC_URL: 'https://open-kb.example.com',
      },
    )

    expect(getReturnToFromQuery()).toBe('https://open-kb.example.com/dashboard')
    expect(buildQueryString()).toBe(
      'returnTo=https%3A%2F%2Fopen-kb.example.com%2Fdashboard&app=Open-KB',
    )
  })

  it('rejects external return destinations', () => {
    setWindowLocation(buildSearch('https://evil.example/phish'))

    expect(getReturnToFromQuery()).toBe('')
    expect(buildQueryString()).toBe('app=Open-ETL')
  })

  it('rejects Accounts return destinations to avoid login loops', () => {
    setWindowLocation(buildSearch('http://localhost:5991/account/general'))

    expect(getReturnToFromQuery()).toBe('')
    expect(buildQueryString()).toBe('app=Open-ETL')
  })

  it('rejects non-http return destinations', () => {
    setWindowLocation(buildSearch('javascript:alert(1)'))

    expect(getReturnToFromQuery()).toBe('')
  })

  it('keeps configured desktop app return destinations', () => {
    setWindowLocation(
      buildSearch('opense://desktop/etl/dashboard'),
      'opense://desktop',
      {
        VITE_ACCOUNTS_URL: 'opense://desktop/accounts',
        VITE_ETL_PUBLIC_URL: 'opense://desktop/etl',
        VITE_STOQR_PUBLIC_URL: 'opense://desktop/stoqr',
      },
    )

    expect(getReturnToFromQuery()).toBe('opense://desktop/etl/dashboard')
    expect(buildQueryString()).toBe(
      'returnTo=opense%3A%2F%2Fdesktop%2Fetl%2Fdashboard&app=Open-ETL',
    )
  })

  it('rejects desktop Accounts return destinations', () => {
    setWindowLocation(
      buildSearch('opense://desktop/accounts/login'),
      'opense://desktop',
      {
        VITE_ACCOUNTS_URL: 'opense://desktop/accounts',
        VITE_ETL_PUBLIC_URL: 'opense://desktop/etl',
        VITE_STOQR_PUBLIC_URL: 'opense://desktop/stoqr',
      },
    )

    expect(getReturnToFromQuery()).toBe('')
    expect(buildQueryString()).toBe('app=Open-ETL')
  })

  it('only redirects back when returnTo is allowed', async () => {
    const replace = setWindowLocation(
      buildSearch('http://localhost:5993/dashboard'),
    )

    await expect(redirectBackToApp()).resolves.toBe(true)
    expect(replace).toHaveBeenCalledWith('http://localhost:5993/dashboard#handoff=true')
  })

  it('does not redirect back when returnTo is rejected', async () => {
    const replace = setWindowLocation(buildSearch('https://evil.example/phish'))

    await expect(redirectBackToApp()).resolves.toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })
})
