import { describe, expect, it } from 'vitest'
import {
  FIRST_PARTY_APPS,
  firstPartyLandingAppCodes,
  firstPartySeatAppCodes,
  getAppDisplayName,
  getAppTitle,
  isFirstPartySeatAppCode,
  isLandingAppCode,
} from '../app-registry'

describe('app registry', () => {
  it('keeps Open-KB in every first-party app surface', () => {
    expect(FIRST_PARTY_APPS.map((app) => app.code)).toEqual(['etl', 'open-kb', 'stoqr'])
    expect(firstPartySeatAppCodes).toEqual(['etl', 'open-kb', 'stoqr'])
    expect(firstPartyLandingAppCodes).toEqual(['etl', 'open-kb', 'stoqr'])
  })

  it('formats app display names from the registry', () => {
    expect(getAppDisplayName('open-kb')).toBe('Open-KB')
    expect(getAppTitle('stoqr')).toBe('Open-StoQR')
  })

  it('validates seat and landing app codes', () => {
    expect(isFirstPartySeatAppCode('open-kb')).toBe(true)
    expect(isFirstPartySeatAppCode('accounts')).toBe(false)
    expect(isLandingAppCode('accounts')).toBe(true)
    expect(isLandingAppCode('unknown')).toBe(false)
  })
})
