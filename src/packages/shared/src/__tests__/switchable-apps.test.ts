/**
 * @vitest-environment jsdom
 */
import { afterEach, describe, expect, it } from 'vitest'
import { buildSwitchableAppHref, getSwitchableApps } from '../switchable-apps'

const setRuntimeConfig = (config: Record<string, string>) => {
  window.__OPENSE_CONFIG__ = config
}

describe('switchable-apps', () => {
  afterEach(() => {
    window.__OPENSE_CONFIG__ = {}
    delete window.openseDesktop
  })

  it('returns ETL and StoQR on web runtimes', () => {
    setRuntimeConfig({
      VITE_ETL_PUBLIC_URL: 'https://etl.example.com',
      VITE_STOQR_PUBLIC_URL: 'https://stoqr.example.com',
      VITE_ASS_PUBLIC_URL: 'https://ass.example.com',
    })

    expect(getSwitchableApps().map((app) => app.key)).toEqual(['etl', 'stoqr'])
  })

  it('returns ETL, StoQR, and Ass on desktop runtimes', () => {
    setRuntimeConfig({
      VITE_OPENSE_RUNTIME_TARGET: 'desktop',
      VITE_ETL_PUBLIC_URL: 'opense://desktop/etl',
      VITE_STOQR_PUBLIC_URL: 'opense://desktop/stoqr',
      VITE_ASS_PUBLIC_URL: 'opense://desktop/ass',
    })

    expect(getSwitchableApps().map((app) => app.key)).toEqual(['etl', 'stoqr', 'ass'])
  })

  it('returns ETL and StoQR on mobile runtimes', () => {
    setRuntimeConfig({
      VITE_OPENSE_RUNTIME_TARGET: 'mobile',
      VITE_ETL_PUBLIC_URL: 'opense://mobile/etl',
      VITE_STOQR_PUBLIC_URL: 'opense://mobile/stoqr',
      VITE_ASS_PUBLIC_URL: 'opense://mobile/ass',
    })

    expect(getSwitchableApps().map((app) => app.key)).toEqual(['etl', 'stoqr'])
  })

  it('returns ETL, StoQR, and Ass when the Electron desktop bridge is present', () => {
    window.openseDesktop = {
      configure: async () => ({}),
    }
    setRuntimeConfig({
      VITE_ETL_PUBLIC_URL: 'http://localhost:5992',
      VITE_STOQR_PUBLIC_URL: 'http://localhost:5993',
      VITE_ASS_PUBLIC_URL: 'http://localhost:5995',
    })

    expect(getSwitchableApps().map((app) => app.key)).toEqual(['etl', 'stoqr', 'ass'])
  })

  it('builds dashboard links for ETL and StoQR', () => {
    setRuntimeConfig({
      VITE_ETL_PUBLIC_URL: 'https://etl.example.com',
      VITE_STOQR_PUBLIC_URL: 'https://stoqr.example.com',
    })

    const apps = getSwitchableApps()
    expect(buildSwitchableAppHref(apps[0])).toBe('https://etl.example.com/dashboard')
    expect(buildSwitchableAppHref(apps[1])).toBe('https://stoqr.example.com/dashboard')
  })
})
