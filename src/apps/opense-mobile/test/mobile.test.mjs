import { describe, expect, it } from 'vitest'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import runtimeConfig from '../scripts/runtime-config.cjs'
import urlRouter from '../scripts/mobile-url-router.cjs'

const { buildMobileRuntimeConfig, serializeMobileRuntimeLoader } = runtimeConfig
const { mobileDeepLinkToPath } = urlRouter
const __dirname = path.dirname(fileURLToPath(import.meta.url))

describe('mobile runtime config', () => {
  it('builds the mobile runtime config contract', () => {
    expect(
      buildMobileRuntimeConfig({
        accountsUrl: 'https://accounts.example.com',
        discovery: {
          supabaseUrl: 'https://example.supabase.co',
          supabasePublishableKey: 'sb_key',
          googleAuthEnabled: true,
        },
      }),
    ).toMatchObject({
      VITE_OPENSE_RUNTIME_TARGET: 'mobile',
      VITE_ACCOUNTS_URL: 'opense://mobile/accounts',
      VITE_ETL_PUBLIC_URL: 'opense://mobile/etl',
      VITE_STOQR_PUBLIC_URL: 'opense://mobile/stoqr',
      VITE_ACCOUNTS_ROUTER_MODE: 'hash',
      VITE_ETL_ROUTER_MODE: 'hash',
      VITE_STOQR_ROUTER_MODE: 'hash',
      VITE_SUPABASE_URL: 'https://example.supabase.co',
      VITE_SUPABASE_ANON_KEY: 'sb_key',
      VITE_GOOGLE_AUTH_ENABLED: 'true',
    })
  })

  it('serializes a synchronous config loader', () => {
    expect(serializeMobileRuntimeLoader()).toContain('window.__OPENSE_CONFIG__')
    expect(serializeMobileRuntimeLoader()).toContain('opense.mobile.config.v1')
  })

  it('builds Accounts as the Capacitor root without standalone setup assets', () => {
    const buildScript = fs.readFileSync(path.resolve(__dirname, '../scripts/build-assets.cjs'), 'utf8')

    expect(buildScript).toContain("copyDir(path.join(app.dir, 'dist'), wwwRoot)")
    expect(buildScript).not.toContain('setup.js')
    expect(buildScript).toContain("'assets'")
  })
})

describe('mobile deep links', () => {
  it('maps mobile custom scheme URLs to bundled hash routes', () => {
    expect(mobileDeepLinkToPath('opense://mobile/accounts/login?x=1')).toBe(
      '/accounts/index.html#/login?x=1',
    )
    expect(mobileDeepLinkToPath('opense://mobile/etl/dashboard')).toBe(
      '/etl/index.html#/dashboard',
    )
    expect(mobileDeepLinkToPath('opense://mobile/stoqr/dashboard')).toBe(
      '/stoqr/index.html#/dashboard',
    )
  })

  it('rejects unbundled mobile targets', () => {
    expect(() => mobileDeepLinkToPath('opense://mobile/opense/dashboard')).toThrow(
      /Unsupported/,
    )
  })
})
