import { describe, expect, it } from 'vitest'
import {
  accountNavigationItems,
  detectAccountsMobileViewport,
  getAccountsLayoutMobileStateClass,
  getAccountsLayoutViewportClass,
  isAccountNavItemActive,
} from '../accountNavigation'

describe('account navigation', () => {
  it('keeps Home as the first navigation entry', () => {
    expect(accountNavigationItems[0]).toMatchObject({
      to: '/account/home',
      label: 'Home',
    })
  })

  it('uses Settings as the canonical settings navigation entry', () => {
    expect(accountNavigationItems).toContainEqual({
      to: '/account/settings',
      label: 'Settings',
    })
    expect(accountNavigationItems).not.toContainEqual({
      to: '/account/preferences',
      label: 'Preferences',
    })
  })

  it('matches active route including nested paths', () => {
    expect(isAccountNavItemActive('/account/profile', '/account/profile')).toBe(true)
    expect(isAccountNavItemActive('/account/profile/avatar', '/account/profile')).toBe(true)
    expect(isAccountNavItemActive('/account/security', '/account/profile')).toBe(false)
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
