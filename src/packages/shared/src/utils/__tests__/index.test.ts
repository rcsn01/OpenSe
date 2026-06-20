import { afterEach, describe, expect, it, vi } from 'vitest'
import {
  buildAccountsAuthUrl,
  buildAccountsForwardQuery,
  buildAccountsOnboardingUrl,
  buildAccountsProfileUrl,
  buildAccountsSettingsUrl,
  buildConfiguredAccountsProfileUrl,
  buildConfiguredAccountsSettingsUrl,
  cn,
  createAccountsRedirects,
  formatCurrency,
  getConfiguredAccountsUrl,
  getSafeAccountsReturnTo,
  appendAppPath,
  parseCsv,
  toNumber,
} from '../index'

describe('utils/index', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  describe('formatCurrency', () => {
    it('returns em dash for null-like values', () => {
      expect(formatCurrency(null)).toBe('—')
      expect(formatCurrency(undefined)).toBe('—')
    })
  })

  describe('toNumber', () => {
    it('returns fallback for invalid numeric input', () => {
      expect(toNumber('invalid')).toBe(0)
      expect(toNumber('invalid', 42)).toBe(42)
    })
  })

  describe('parseCsv', () => {
    it('parses quoted fields containing commas', () => {
      const csv = ['name,sku,description', '"Widget, Large",W-001,"Primary, shelf A"'].join('\n')

      expect(parseCsv(csv)).toEqual({
        headers: ['name', 'sku', 'description'],
        rows: [['Widget, Large', 'W-001', 'Primary, shelf A']],
      })
    })
  })

  describe('cn', () => {
    it('omits falsy values and joins remaining classes', () => {
      expect(cn('base', false, undefined, null, '', 'active')).toBe('base active')
    })
  })

  describe('buildAccountsSettingsUrl', () => {
    it('points app settings actions to the Accounts settings page', () => {
      expect(buildAccountsSettingsUrl({ accountsUrl: 'https://accounts.example.com/' })).toBe(
        'https://accounts.example.com/account/settings',
      )
    })

    it('preserves desktop app base paths', () => {
      expect(buildAccountsSettingsUrl({ accountsUrl: 'opense://desktop/accounts' })).toBe(
        'opense://desktop/accounts/account/settings',
      )
    })

    it('preserves mobile app base paths', () => {
      expect(buildAccountsSettingsUrl({ accountsUrl: 'opense://mobile/accounts' })).toBe(
        'opense://mobile/accounts/account/settings',
      )
    })
  })

  describe('buildAccountsProfileUrl', () => {
    it('points app profile actions to the Accounts profile page', () => {
      expect(buildAccountsProfileUrl({ accountsUrl: 'https://accounts.example.com/' })).toBe(
        'https://accounts.example.com/account/profile',
      )
    })
  })

  describe('configured accounts URLs', () => {
    it('uses the supplied fallback when runtime config is unavailable', () => {
      vi.stubGlobal('window', {
        location: {
          protocol: 'https:',
          hostname: 'ui.example.com',
        },
        __OPENSE_CONFIG__: {},
      })

      expect(getConfiguredAccountsUrl('https://accounts.test')).toBe('https://accounts.test')
      expect(buildConfiguredAccountsProfileUrl('https://accounts.test')).toBe(
        'https://accounts.test/account/profile',
      )
      expect(buildConfiguredAccountsSettingsUrl('https://accounts.test')).toBe(
        'https://accounts.test/account/settings',
      )
    })

    it('infers the local Accounts app when config is missing in local dev', () => {
      vi.stubGlobal('window', {
        location: {
          protocol: 'http:',
          hostname: 'localhost',
        },
        __OPENSE_CONFIG__: {},
      })

      expect(getConfiguredAccountsUrl('https://accounts.test')).toBe('http://localhost:5991')
      expect(buildConfiguredAccountsProfileUrl('https://accounts.test')).toBe(
        'http://localhost:5991/account/profile',
      )
      expect(buildConfiguredAccountsSettingsUrl('https://accounts.test')).toBe(
        'http://localhost:5991/account/settings',
      )
    })

    it('ignores placeholder example Accounts URLs in local dev', () => {
      vi.stubGlobal('window', {
        location: {
          protocol: 'http:',
          hostname: '127.0.0.1',
        },
        __OPENSE_CONFIG__: {
          VITE_ACCOUNTS_URL: 'https://accounts.example.com',
        },
      })

      expect(buildConfiguredAccountsSettingsUrl('https://accounts.test')).toBe(
        'http://127.0.0.1:5991/account/settings',
      )
    })
  })

  describe('appendAppPath', () => {
    it('appends paths without replacing custom-protocol base paths', () => {
      expect(appendAppPath('opense://desktop/etl', '/dashboard')).toBe(
        'opense://desktop/etl/dashboard',
      )
      expect(appendAppPath('opense://mobile/stoqr', '/dashboard')).toBe(
        'opense://mobile/stoqr/dashboard',
      )
      expect(appendAppPath('https://etl.example.com/app', '/dashboard')).toBe(
        'https://etl.example.com/app/dashboard',
      )
    })
  })

  describe('accounts redirects', () => {
    it('builds signin and signup URLs for Accounts auth', () => {
      const signin = new URL(buildAccountsAuthUrl({
        mode: 'signin',
        accountsUrl: 'https://accounts.example.com/',
        appPublicUrl: 'https://etl.example.com/',
        appName: 'Open-ETL',
      }))
      const signup = new URL(buildAccountsAuthUrl({
        mode: 'signup',
        accountsUrl: 'https://accounts.example.com/',
        appPublicUrl: 'https://etl.example.com/',
        appName: 'Open-ETL',
      }))

      expect(signin.pathname).toBe('/login')
      expect(signin.searchParams.get('app')).toBe('Open-ETL')
      expect(signin.searchParams.get('returnTo')).toBe('https://etl.example.com/dashboard')
      expect(signup.pathname).toBe('/register')
    })

    it('builds onboarding URLs with encoded app and return target', () => {
      const url = new URL(buildAccountsOnboardingUrl({
        accountsUrl: 'https://accounts.example.com/',
        appPublicUrl: 'https://stoqr.example.com/',
        appName: 'Open-StoQR',
        redirectPath: '/inventory/all?tab=low-stock',
      }))

      expect(url.pathname).toBe('/onboarding')
      expect(url.searchParams.get('app')).toBe('Open-StoQR')
      expect(url.searchParams.get('returnTo')).toBe('https://stoqr.example.com/inventory/all?tab=low-stock')
    })

    it('normalizes trailing slashes through the redirect factory', () => {
      const redirects = createAccountsRedirects({
        accountsUrl: 'https://accounts.example.com///',
        appPublicUrl: 'https://etl.example.com///',
        appName: 'Open-ETL',
      })

      expect(redirects.profile()).toBe('https://accounts.example.com/account/profile')
      expect(redirects.settings()).toBe('https://accounts.example.com/account/settings')
      expect(new URL(redirects.auth('signin')).searchParams.get('returnTo')).toBe('https://etl.example.com/dashboard')
    })
  })

  describe('accounts returnTo validation', () => {
    const config = {
      accountsUrl: 'https://accounts.example.com',
      allowedAppPublicUrls: ['https://etl.example.com', 'https://stoqr.example.com'],
      currentOrigin: 'https://accounts.example.com',
      currentHostname: 'accounts.example.com',
    }

    it('rejects unsafe or external return targets', () => {
      expect(getSafeAccountsReturnTo('javascript:alert(1)', config)).toBe('')
      expect(getSafeAccountsReturnTo('https://evil.example/phish', config)).toBe('')
      expect(getSafeAccountsReturnTo('https://accounts.example.com/account/profile', config)).toBe('')
    })

    it('accepts configured app origins', () => {
      expect(getSafeAccountsReturnTo('https://etl.example.com/dashboard', config)).toBe(
        'https://etl.example.com/dashboard',
      )
    })

    it('accepts configured desktop app prefixes', () => {
      const desktopConfig = {
        ...config,
        allowedAppPublicUrls: [
          'opense://desktop/etl',
          'opense://desktop/stoqr',
        ],
      }

      expect(getSafeAccountsReturnTo('opense://desktop/etl/dashboard', desktopConfig)).toBe(
        'opense://desktop/etl/dashboard',
      )
      expect(getSafeAccountsReturnTo('opense://desktop/stoqr/dashboard', desktopConfig)).toBe(
        'opense://desktop/stoqr/dashboard',
      )
    })

    it('rejects Accounts, unbundled OpenSe, and unknown desktop return targets', () => {
      const desktopConfig = {
        ...config,
        allowedAppPublicUrls: [
          'opense://desktop/etl',
          'opense://desktop/stoqr',
        ],
      }

      expect(getSafeAccountsReturnTo('opense://desktop/accounts/login', desktopConfig)).toBe('')
      expect(getSafeAccountsReturnTo('opense://desktop/opense/', desktopConfig)).toBe('')
      expect(getSafeAccountsReturnTo('opense://desktop/admin', desktopConfig)).toBe('')
      expect(getSafeAccountsReturnTo('opense://phishing/etl/dashboard', desktopConfig)).toBe('')
    })

    it('accepts configured mobile app prefixes', () => {
      const mobileConfig = {
        ...config,
        allowedAppPublicUrls: [
          'opense://mobile/etl',
          'opense://mobile/stoqr',
        ],
      }

      expect(getSafeAccountsReturnTo('opense://mobile/etl/dashboard', mobileConfig)).toBe(
        'opense://mobile/etl/dashboard',
      )
      expect(getSafeAccountsReturnTo('opense://mobile/stoqr/dashboard', mobileConfig)).toBe(
        'opense://mobile/stoqr/dashboard',
      )
    })

    it('rejects Accounts, unbundled OpenSe, and unknown mobile return targets', () => {
      const mobileConfig = {
        ...config,
        allowedAppPublicUrls: [
          'opense://mobile/etl',
          'opense://mobile/stoqr',
        ],
      }

      expect(getSafeAccountsReturnTo('opense://mobile/accounts/login', mobileConfig)).toBe('')
      expect(getSafeAccountsReturnTo('opense://mobile/opense/', mobileConfig)).toBe('')
      expect(getSafeAccountsReturnTo('opense://mobile/admin', mobileConfig)).toBe('')
      expect(getSafeAccountsReturnTo('opense://desktop/etl/dashboard', mobileConfig)).toBe('')
      expect(getSafeAccountsReturnTo('opense://phishing/etl/dashboard', mobileConfig)).toBe('')
    })

    it('accepts local app ports only when local origins are enabled', () => {
      expect(getSafeAccountsReturnTo('http://localhost:5992/dashboard', config)).toBe('')
      expect(getSafeAccountsReturnTo('http://localhost:5992/dashboard', {
        ...config,
        allowLocalAppOrigins: true,
      })).toBe('http://localhost:5992/dashboard')
      expect(getSafeAccountsReturnTo('http://localhost:5995/dashboard', {
        ...config,
        allowLocalAppOrigins: true,
      })).toBe('http://localhost:5995/dashboard')
      expect(getSafeAccountsReturnTo('http://localhost:7777/dashboard', {
        ...config,
        allowLocalAppOrigins: true,
      })).toBe('')
    })

    it('builds forwarding query strings with only safe return targets', () => {
      const safe = buildAccountsForwardQuery({
        ...config,
        search: '?app=Open-ETL&returnTo=https%3A%2F%2Fetl.example.com%2Fdashboard',
      })
      const unsafe = buildAccountsForwardQuery({
        ...config,
        search: '?app=Open-ETL&returnTo=https%3A%2F%2Fevil.example%2Fphish',
      })

      expect(safe).toBe('returnTo=https%3A%2F%2Fetl.example.com%2Fdashboard&app=Open-ETL')
      expect(unsafe).toBe('app=Open-ETL')
    })
  })
})
