import { describe, expect, it } from 'vitest'
import {
  accountNavigationItems,
  detectAccountsMobileViewport,
  getAccountsLayoutMobileStateClass,
  getAccountsLayoutViewportClass,
  isAccountNavItemActive,
} from '../accountNavigation'

describe('account navigation', () => {
  it('keeps General as the first navigation entry', () => {
    expect(accountNavigationItems[0]).toMatchObject({
      to: '/account/general',
      label: 'General',
    })
  })

  it('matches active route including nested paths', () => {
    expect(isAccountNavItemActive('/account/general', '/account/general')).toBe(true)
    expect(isAccountNavItemActive('/account/general/preferences', '/account/general')).toBe(true)
    expect(isAccountNavItemActive('/account/settings', '/account/general')).toBe(false)
  })

  it('returns layout class by mobile nav open state', () => {
    expect(getAccountsLayoutMobileStateClass(true)).toBe('accounts-layout-mobile-open')
    expect(getAccountsLayoutMobileStateClass(false)).toBe('accounts-layout-mobile-closed')
  })

  it('returns viewport class for responsive layout state', () => {
    expect(getAccountsLayoutViewportClass(true)).toBe('accounts-layout-is-mobile')
    expect(getAccountsLayoutViewportClass(false)).toBe('accounts-layout-is-desktop')
  })

  it('detects mobile viewport from explicit width checks', () => {
    expect(detectAccountsMobileViewport(false, 600, 1024, 1024)).toBe(true)
    expect(detectAccountsMobileViewport(false, 1024, 600, 1024)).toBe(true)
    expect(detectAccountsMobileViewport(false, 1024, 1024, 600)).toBe(true)
    expect(detectAccountsMobileViewport(false, 1024, 1024, 1024)).toBe(false)
  })

  it('detects mobile viewport from media query match', () => {
    expect(detectAccountsMobileViewport(true, 1200, 1200, 1200)).toBe(true)
  })
})
