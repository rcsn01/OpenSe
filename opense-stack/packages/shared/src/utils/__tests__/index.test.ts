import { describe, expect, it } from 'vitest'
import {
  buildAccountsAuthUrl,
  buildAccountsForwardQuery,
  buildAccountsOnboardingUrl,
  buildAccountsSettingsUrl,
  cn,
  createAccountsRedirects,
  formatCurrency,
  getSafeAccountsReturnTo,
  appendAppPath,
  parseCsv,
  toNumber,
} from '../index'

describe('utils/index', () => {
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
    it('points app settings actions to the Accounts profile center', () => {
      expect(buildAccountsSettingsUrl({ accountsUrl: 'https://accounts.example.com/' })).toBe(
        'https://accounts.example.com/account/profile',
      )
    })

    it('preserves desktop app base paths', () => {
      expect(buildAccountsSettingsUrl({ accountsUrl: 'opense://desktop/accounts' })).toBe(
        'opense://desktop/accounts/account/profile',
      )
    })
  })

  describe('appendAppPath', () => {
    it('appends paths without replacing custom-protocol base paths', () => {
      expect(appendAppPath('opense://desktop/etl', '/dashboard')).toBe(
        'opense://desktop/etl/dashboard',
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

      expect(redirects.settings()).toBe('https://accounts.example.com/account/profile')
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

    it('accepts local app ports only when local origins are enabled', () => {
      expect(getSafeAccountsReturnTo('http://localhost:5992/dashboard', config)).toBe('')
      expect(getSafeAccountsReturnTo('http://localhost:5992/dashboard', {
        ...config,
        allowLocalAppOrigins: true,
      })).toBe('http://localhost:5992/dashboard')
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
