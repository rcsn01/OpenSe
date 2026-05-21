import { describe, expect, it } from 'vitest'
import { buildAccountsSettingsUrl, cn, formatCurrency, parseCsv, toNumber } from '../index'

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
  })
})
