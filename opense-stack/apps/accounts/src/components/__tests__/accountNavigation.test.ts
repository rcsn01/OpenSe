import { describe, expect, it } from 'vitest'
import {
  accountNavigationItems,
  getAccountsLayoutMobileStateClass,
  isAccountNavItemActive,
} from '../accountNavigation'

describe('account navigation', () => {
  it('keeps General as the first navigation entry', () => {
    expect(accountNavigationItems[0]).toMatchObject({
      to: '/general',
      label: 'General',
    })
  })

  it('matches active route including nested paths', () => {
    expect(isAccountNavItemActive('/general', '/general')).toBe(true)
    expect(isAccountNavItemActive('/general/preferences', '/general')).toBe(true)
    expect(isAccountNavItemActive('/settings', '/general')).toBe(false)
  })

  it('returns layout class by mobile nav open state', () => {
    expect(getAccountsLayoutMobileStateClass(true)).toBe('accounts-layout-mobile-open')
    expect(getAccountsLayoutMobileStateClass(false)).toBe('accounts-layout-mobile-closed')
  })
})
