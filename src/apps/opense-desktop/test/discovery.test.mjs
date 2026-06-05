import { describe, expect, it } from 'vitest'
import discovery from '../electron/discovery.cjs'
import runtimeConfig from '../electron/runtime-config.cjs'

const {
  buildDiscoveryUrl,
  fetchDiscoveryConfig,
  normalizeAccountsUrl,
  validateStoredDesktopConfig,
  validateDiscoveryConfig,
} = discovery
const { buildDesktopRuntimeConfig } = runtimeConfig

describe('desktop discovery', () => {
  it('normalizes the hosted Accounts URL', () => {
    expect(normalizeAccountsUrl('https://accounts.example.com///')).toBe(
      'https://accounts.example.com',
    )
    expect(buildDiscoveryUrl('https://accounts.example.com/')).toBe(
      'https://accounts.example.com/.well-known/opense-desktop.json',
    )
  })

  it('accepts valid v1 discovery JSON', () => {
    expect(
      validateDiscoveryConfig({
        version: 1,
        instanceName: 'OpenSe',
        supabaseUrl: 'https://example.supabase.co/',
        supabasePublishableKey: 'sb_publishable_key',
        googleAuthEnabled: true,
      }),
    ).toEqual({
      version: 1,
      instanceName: 'OpenSe',
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'sb_publishable_key',
      googleAuthEnabled: true,
    })
  })

  it('rejects invalid Supabase values', () => {
    expect(() =>
      validateDiscoveryConfig({
        version: 1,
        supabaseUrl: 'not-a-url',
        supabasePublishableKey: 'key',
        googleAuthEnabled: false,
      }),
    ).toThrow(/Supabase URL/)

    expect(() =>
      validateDiscoveryConfig({
        version: 1,
        supabaseUrl: 'https://example.supabase.co',
        supabasePublishableKey: '',
        googleAuthEnabled: false,
      }),
    ).toThrow(/publishable key/)
  })

  it('reports HTML discovery responses clearly', async () => {
    const originalFetch = globalThis.fetch
    globalThis.fetch = async () =>
      new Response('<!doctype html><html></html>', {
        headers: { 'content-type': 'text/html' },
      })

    await expect(fetchDiscoveryConfig('https://accounts.example.com')).rejects.toThrow(
      /returned HTML instead of JSON/,
    )

    globalThis.fetch = originalFetch
  })

  it('builds the desktop runtime config contract', () => {
    const config = buildDesktopRuntimeConfig({
      supabaseUrl: 'https://example.supabase.co',
      supabasePublishableKey: 'sb_key',
      googleAuthEnabled: false,
    })

    expect(config).toMatchObject({
      VITE_OPENSE_RUNTIME_TARGET: 'desktop',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_key',
      VITE_ACCOUNTS_URL: 'opense://desktop/accounts',
      VITE_ACCOUNTS_ROUTER_BASENAME: '/accounts',
      VITE_ETL_PUBLIC_URL: 'opense://desktop/etl',
      VITE_STOQR_PUBLIC_URL: 'opense://desktop/stoqr',
    })
    expect(config).not.toHaveProperty('VITE_OPENSE_PUBLIC_URL')
    expect(config).not.toHaveProperty('VITE_OPENSE_ROUTER_BASENAME')
  })

  it('builds unconfigured desktop runtime defaults without Supabase values', () => {
    const config = buildDesktopRuntimeConfig()

    expect(config).toMatchObject({
      VITE_OPENSE_RUNTIME_TARGET: 'desktop',
      VITE_ACCOUNTS_URL: 'opense://desktop/accounts',
      VITE_ACCOUNTS_ROUTER_BASENAME: '/accounts',
      VITE_ETL_PUBLIC_URL: 'opense://desktop/etl',
      VITE_STOQR_PUBLIC_URL: 'opense://desktop/stoqr',
    })
    expect(config).not.toHaveProperty('VITE_SUPABASE_URL')
    expect(config).not.toHaveProperty('VITE_SUPABASE_ANON_KEY')
  })

  it('validates stored desktop config before reuse', () => {
    expect(
      validateStoredDesktopConfig({
        accountsUrl: 'https://accounts.example.com/',
        discovery: {
          version: 1,
          instanceName: 'OpenSe',
          supabaseUrl: 'https://example.supabase.co',
          supabasePublishableKey: 'sb_key',
          googleAuthEnabled: false,
        },
      }),
    ).toMatchObject({
      accountsUrl: 'https://accounts.example.com',
      discovery: {
        supabasePublishableKey: 'sb_key',
      },
    })

    expect(() =>
      validateStoredDesktopConfig({
        accountsUrl: 'https://accounts.example.com',
        discovery: {},
      }),
    ).toThrow(/Unsupported discovery version/)
  })
})
