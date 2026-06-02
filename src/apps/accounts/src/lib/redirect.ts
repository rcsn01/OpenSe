import {
  buildAccountsForwardQuery,
  getSafeAccountsReturnTo,
} from '@repo/shared/utils'
import { getRuntimeConfigValue } from '@repo/shared/runtime-config'

const APP_PUBLIC_URL_KEYS = [
  'VITE_ETL_PUBLIC_URL',
  'VITE_OPENSE_PUBLIC_URL',
  'VITE_STOQR_PUBLIC_URL',
  'VITE_UI_PUBLIC_URL',
] as const

const getAccountsUrl = () =>
  getRuntimeConfigValue('VITE_ACCOUNTS_URL') ?? ''

const getAllowedAppPublicUrls = () =>
  APP_PUBLIC_URL_KEYS.map((key) => getRuntimeConfigValue(key))

const getReturnToValidationConfig = () => ({
  accountsUrl: getAccountsUrl(),
  allowedAppPublicUrls: getAllowedAppPublicUrls(),
  currentOrigin: window.location.origin,
  currentHostname: window.location.hostname,
  allowLocalAppOrigins: import.meta.env.DEV,
})

export const getAppNameFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('app') ?? 'OpenSe'
}

export const getReturnToFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  return getSafeAccountsReturnTo(
    params.get('returnTo'),
    getReturnToValidationConfig(),
  )
}

export const buildQueryString = () => {
  return buildAccountsForwardQuery({
    search: window.location.search,
    ...getReturnToValidationConfig(),
  })
}

export const buildPathWithQuery = (path: string) => {
  const query = buildQueryString()
  if (!query) {
    return path
  }

  return `${path}?${query}`
}

export const redirectBackToApp = () => {
  const returnTo = getReturnToFromQuery()
  if (!returnTo) {
    return false
  }

  window.location.replace(returnTo)
  return true
}
