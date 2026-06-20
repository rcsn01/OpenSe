export type FirstPartyAppCode = 'etl' | 'open-kb' | 'stoqr'
export type LandingAppCode = 'accounts' | FirstPartyAppCode

export type FirstPartyAppDefinition = {
  code: FirstPartyAppCode
  displayName: string
  title: string
  compactLabel: string
  localUrl: string
  envUrlKeys: readonly string[]
  defaultRoute: string
  iconKey: FirstPartyAppCode
  seatEligible: boolean
  billingEligible: boolean
  landingAppEligible: boolean
}

export const FIRST_PARTY_APPS = [
  {
    code: 'etl',
    displayName: 'ETL',
    title: 'Open-ETL',
    compactLabel: 'ETL',
    localUrl: 'http://localhost:5992',
    envUrlKeys: ['VITE_ETL_PUBLIC_URL', 'VITE_ETL_URL'],
    defaultRoute: '/dashboard',
    iconKey: 'etl',
    seatEligible: true,
    billingEligible: true,
    landingAppEligible: true,
  },
  {
    code: 'open-kb',
    displayName: 'Open-KB',
    title: 'Open-KB',
    compactLabel: 'KB',
    localUrl: 'http://localhost:5995',
    envUrlKeys: ['VITE_OPEN_KB_PUBLIC_URL', 'VITE_OPEN_KB_URL'],
    defaultRoute: '/dashboard',
    iconKey: 'open-kb',
    seatEligible: true,
    billingEligible: true,
    landingAppEligible: true,
  },
  {
    code: 'stoqr',
    displayName: 'StoQR',
    title: 'Open-StoQR',
    compactLabel: 'StoQR',
    localUrl: 'http://localhost:5993',
    envUrlKeys: ['VITE_STOQR_PUBLIC_URL', 'VITE_STOQR_URL'],
    defaultRoute: '/dashboard',
    iconKey: 'stoqr',
    seatEligible: true,
    billingEligible: true,
    landingAppEligible: true,
  },
] as const satisfies readonly FirstPartyAppDefinition[]

export const firstPartyAppCodes = FIRST_PARTY_APPS.map((app) => app.code)
export const firstPartySeatAppCodes = FIRST_PARTY_APPS
  .filter((app) => app.seatEligible)
  .map((app) => app.code)
export const firstPartyBillingAppCodes = FIRST_PARTY_APPS
  .filter((app) => app.billingEligible)
  .map((app) => app.code)
export const firstPartyLandingAppCodes = FIRST_PARTY_APPS
  .filter((app) => app.landingAppEligible)
  .map((app) => app.code)

export const isFirstPartyAppCode = (value: string | null | undefined): value is FirstPartyAppCode =>
  Boolean(value && firstPartyAppCodes.includes(value as FirstPartyAppCode))

export const isFirstPartySeatAppCode = (value: string | null | undefined): value is FirstPartyAppCode =>
  Boolean(value && firstPartySeatAppCodes.includes(value as FirstPartyAppCode))

export const isLandingAppCode = (value: string | null | undefined): value is LandingAppCode =>
  value === 'accounts' || isFirstPartyAppCode(value)

export const getFirstPartyApp = (code: FirstPartyAppCode) =>
  FIRST_PARTY_APPS.find((app) => app.code === code) ?? FIRST_PARTY_APPS[0]

export const getAppDisplayName = (code: FirstPartyAppCode) => getFirstPartyApp(code).displayName

export const getAppTitle = (code: FirstPartyAppCode) => getFirstPartyApp(code).title
