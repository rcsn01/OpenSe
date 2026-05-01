import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildQueryString,
  getReturnToFromQuery,
  redirectBackToApp,
} from '../redirect'

const setWindowLocation = (
  search: string,
  origin = 'http://localhost:5991',
) => {
  const url = new URL(origin)
  const replace = vi.fn()

  vi.stubGlobal('window', {
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

  it('only redirects back when returnTo is allowed', () => {
    const replace = setWindowLocation(
      buildSearch('http://localhost:5993/dashboard'),
    )

    expect(redirectBackToApp()).toBe(true)
    expect(replace).toHaveBeenCalledWith('http://localhost:5993/dashboard')
  })

  it('does not redirect back when returnTo is rejected', () => {
    const replace = setWindowLocation(buildSearch('https://evil.example/phish'))

    expect(redirectBackToApp()).toBe(false)
    expect(replace).not.toHaveBeenCalled()
  })
})
