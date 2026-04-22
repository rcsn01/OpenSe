import { buildAccountsAuthUrl as buildSharedAccountsAuthUrl, type AuthMode } from '@repo/shared/utils'

export type LandingContext = 'opense' | 'etl' | 'stoqr'

const ACCOUNTS_URL = (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? 'http://localhost:5991'
const OPENSE_PUBLIC_URL = (import.meta.env.VITE_OPENSE_PUBLIC_URL as string | undefined) ?? 'http://localhost:5994'
const ETL_PUBLIC_URL = (import.meta.env.VITE_ETL_PUBLIC_URL as string | undefined) ?? 'http://localhost:5992'
const STOQR_PUBLIC_URL = (import.meta.env.VITE_STOQR_PUBLIC_URL as string | undefined) ?? 'http://localhost:5993'

const LANDING_CONTEXT_KEY = 'opense-active-landing-context'

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