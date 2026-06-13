import {
  buildAccountsAuthUrl as buildSharedAccountsAuthUrl,
  type AuthMode,
} from '@repo/shared/utils'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'

export type LandingContext = 'opense' | 'etl' | 'stoqr'

const ACCOUNTS_URL =
  getRuntimeConfigValue('VITE_ACCOUNTS_URL', 'http://localhost:5991') ??
  'http://localhost:5991'
const OPENSE_PUBLIC_URL =
  getRuntimeConfigValue('VITE_OPENSE_PUBLIC_URL', 'http://localhost:5994') ??
  'http://localhost:5994'
const ETL_PUBLIC_URL =
  getRuntimeConfigValue('VITE_ETL_PUBLIC_URL', 'http://localhost:5992') ??
  'http://localhost:5992'
const STOQR_PUBLIC_URL =
  getRuntimeConfigValue('VITE_STOQR_PUBLIC_URL', 'http://localhost:5993') ??
  'http://localhost:5993'

const normalizeBaseUrl = (value: string) => value.replace(/\/$/, '')

export const normalizeLandingContext = (
  value: string | null | undefined,
): LandingContext => {
  if (value === 'etl' || value === 'stoqr') {
    return value
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
