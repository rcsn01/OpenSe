import { afterEach, describe, expect, it, vi } from 'vitest'

afterEach(() => {
  vi.unstubAllEnvs()
  vi.resetModules()
})

describe('OpenSe auth redirects', () => {
  it('prefers the OpenSe public URL for Accounts return targets', async () => {
    vi.stubEnv('VITE_ACCOUNTS_URL', 'http://localhost:5991')
    vi.stubEnv('VITE_OPENSE_PUBLIC_URL', 'http://localhost:5994')
    vi.stubEnv('VITE_UI_PUBLIC_URL', 'http://localhost:5999')

    const { buildOpenSeAccountsAuthUrl } = await import('../authRedirect')
    const url = new URL(buildOpenSeAccountsAuthUrl('signin'))

    expect(url.origin).toBe('http://localhost:5991')
    expect(url.pathname).toBe('/login')
    expect(url.searchParams.get('app')).toBe('OpenSe')
    expect(url.searchParams.get('returnTo')).toBe('http://localhost:5994/')
  })

  it('falls back to the default OpenSe local URL when no explicit OpenSe public URL is set', async () => {
    vi.stubEnv('VITE_ACCOUNTS_URL', 'http://localhost:5991')
    vi.stubEnv('VITE_UI_PUBLIC_URL', 'http://localhost:5999')

    const { buildOpenSeAccountsAuthUrl } = await import('../authRedirect')
    const url = new URL(buildOpenSeAccountsAuthUrl('signup'))

    expect(url.origin).toBe('http://localhost:5991')
    expect(url.pathname).toBe('/register')
    expect(url.searchParams.get('app')).toBe('OpenSe')
    expect(url.searchParams.get('returnTo')).toBe('http://localhost:5994/')
  })
})