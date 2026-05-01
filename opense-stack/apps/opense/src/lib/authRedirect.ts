import {
  buildAccountsAuthUrl as buildSharedAccountsAuthUrl,
  type AuthMode,
} from '@repo/shared/utils'

export type LandingContext = 'opense' | 'etl' | 'stoqr'

const ACCOUNTS_URL =
  (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ??
  'http://localhost:5991'
const OPENSE_PUBLIC_URL =
  (import.meta.env.VITE_OPENSE_PUBLIC_URL as string | undefined) ??
  (import.meta.env.VITE_UI_PUBLIC_URL as string | undefined) ??
  'http://localhost:5994'
const ETL_PUBLIC_URL =
  (import.meta.env.VITE_ETL_PUBLIC_URL as string | undefined) ??
  'http://localhost:5992'
const STOQR_PUBLIC_URL =
  (import.meta.env.VITE_STOQR_PUBLIC_URL as string | undefined) ??
  'http://localhost:5993'

const LANDING_CONTEXT_KEY = 'opense-active-landing-context'

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '')

export const normalizeLandingContext = (
  value: string | null | undefined,
): LandingContext => {
  if (value === 'etl' || value === 'stoqr') {
    return value
  }

  return 'opense'
}

export const getLandingContextFromPathname = (
  pathname: string,
): LandingContext => {
  if (pathname.startsWith('/etl')) {
    return 'etl'
  }

  if (pathname.startsWith('/stoqr')) {
    return 'stoqr'
  }

  return 'opense'
}

const buildAccountsLoginUrl = () => {
  const params = new URLSearchParams({ app: 'Accounts' })
  return `${normalizeBaseUrl(ACCOUNTS_URL)}/login?${params.toString()}`
}

export const buildNavbarGetStartedPath = (context: LandingContext) => {
  const params = new URLSearchParams({ context })
  return `/get-started?${params.toString()}`
}

export const buildAccountsAppUrl = () =>
  `${normalizeBaseUrl(ACCOUNTS_URL)}/account/general`

export const buildEtlDashboardUrl = () =>
  `${normalizeBaseUrl(ETL_PUBLIC_URL)}/dashboard`

export const buildStoqrDashboardUrl = () =>
  `${normalizeBaseUrl(STOQR_PUBLIC_URL)}/dashboard`

export const setActiveLandingContext = (context: LandingContext) => {
  if (typeof window === 'undefined') {
    return
  }

  window.sessionStorage.setItem(LANDING_CONTEXT_KEY, context)
}

const getActiveLandingContext = (): LandingContext => {
  if (typeof window === 'undefined') {
    return 'opense'
  }

  const value = window.sessionStorage.getItem(LANDING_CONTEXT_KEY)
  if (value === 'etl' || value === 'stoqr') {
    return value
  }

  return 'opense'
}

export const buildOpenSeAccountsAuthUrl = (mode: AuthMode) => {
  return buildSharedAccountsAuthUrl({
    mode,
    accountsUrl: ACCOUNTS_URL,
    appPublicUrl: OPENSE_PUBLIC_URL,
    appName: 'OpenSe',
    redirectPath: '/',
  })
}

export const buildEtlAccountsAuthUrl = (mode: AuthMode) => {
  return buildSharedAccountsAuthUrl({
    mode,
    accountsUrl: ACCOUNTS_URL,
    appPublicUrl: ETL_PUBLIC_URL,
    appName: 'Open-ETL',
  })
}

export const buildStoqrAccountsAuthUrl = (mode: AuthMode) => {
  return buildSharedAccountsAuthUrl({
    mode,
    accountsUrl: ACCOUNTS_URL,
    appPublicUrl: STOQR_PUBLIC_URL,
    appName: 'Open-StoQR',
  })
}

export const buildAccountsAuthUrl = (mode: AuthMode) => {
  if (getActiveLandingContext() === 'etl') {
    return buildEtlAccountsAuthUrl(mode)
  }

  return buildOpenSeAccountsAuthUrl(mode)
}

export const buildGetStartedGuestUrl = (context: LandingContext) => {
  if (context === 'etl') {
    return buildEtlAccountsAuthUrl('signin')
  }

  if (context === 'stoqr') {
    return buildStoqrAccountsAuthUrl('signin')
  }

  return buildAccountsLoginUrl()
}

export const buildGetStartedAuthenticatedUrl = (context: LandingContext) => {
  if (context === 'etl') {
    return buildEtlDashboardUrl()
  }

  if (context === 'stoqr') {
    return buildStoqrDashboardUrl()
  }

  return buildAccountsAppUrl()
}
