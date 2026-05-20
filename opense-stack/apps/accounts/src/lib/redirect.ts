import { getRuntimeConfigValue } from '@repo/shared/runtime-config'

const isSafeHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const LOCAL_APP_RETURN_URLS = [
  'http://localhost:5990',
  'http://localhost:5992',
  'http://localhost:5993',
  'http://localhost:5994',
  'http://localhost:5999',
]

const APP_PUBLIC_URL_KEYS = [
  'VITE_ADMIN_PUBLIC_URL',
  'VITE_ETL_PUBLIC_URL',
  'VITE_OPENSE_PUBLIC_URL',
  'VITE_STOQR_PUBLIC_URL',
  'VITE_UI_PUBLIC_URL',
] as const

const getAccountsUrl = () =>
  getRuntimeConfigValue('VITE_ACCOUNTS_URL') ?? ''

const getOriginIfSafe = (value: string): string | null => {
  if (!isSafeHttpUrl(value)) {
    return null
  }

  return new URL(value).origin
}

const getAccountsOrigins = () => {
  const origins = new Set<string>([window.location.origin])
  const accountsUrl = getAccountsUrl()

  if (accountsUrl) {
    const accountsOrigin = getOriginIfSafe(accountsUrl)
    if (accountsOrigin) {
      origins.add(accountsOrigin)
    }
  }

  return origins
}

const isAccountsOrigin = (origin: string) => getAccountsOrigins().has(origin)

const getAllowedReturnOrigins = () => {
  const origins = new Set<string>()

  for (const key of APP_PUBLIC_URL_KEYS) {
    const value = getRuntimeConfigValue(key)
    const origin = value ? getOriginIfSafe(value) : null
    if (origin && !isAccountsOrigin(origin)) {
      origins.add(origin)
    }
  }

  if (
    import.meta.env.DEV ||
    window.location.hostname === 'localhost' ||
    window.location.hostname === '127.0.0.1'
  ) {
    for (const value of LOCAL_APP_RETURN_URLS) {
      const origin = getOriginIfSafe(value)
      if (origin && !isAccountsOrigin(origin)) {
        origins.add(origin)
      }
    }
  }

  return origins
}

const isAllowedReturnOrigin = (origin: string) =>
  getAllowedReturnOrigins().has(origin)

export const getAppNameFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('app') ?? 'OpenSe'
}

export const getReturnToFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  const returnTo = params.get('returnTo')

  if (returnTo && isSafeHttpUrl(returnTo)) {
    // Only return to known first-party app origins. This prevents Accounts from
    // becoming an open redirect after login.
    const returnOrigin = getOriginIfSafe(returnTo)
    if (
      returnOrigin &&
      !isAccountsOrigin(returnOrigin) &&
      isAllowedReturnOrigin(returnOrigin)
    ) {
      return returnTo
    }
  }

  return ''
}

export const buildQueryString = () => {
  const params = new URLSearchParams(window.location.search)
  const app = params.get('app')
  const returnTo = getReturnToFromQuery()

  const next = new URLSearchParams()
  if (returnTo) {
    next.set('returnTo', returnTo)
  }
  if (app) {
    next.set('app', app)
  }

  return next.toString()
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
