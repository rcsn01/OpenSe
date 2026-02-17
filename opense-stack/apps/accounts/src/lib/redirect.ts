const isSafeHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const accountsUrl = (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? ''

const getOriginIfSafe = (value: string): string | null => {
  if (!isSafeHttpUrl(value)) {
    return null
  }

  return new URL(value).origin
}

const getAccountsOrigins = () => {
  const origins = new Set<string>([window.location.origin])

  if (accountsUrl) {
    const accountsOrigin = getOriginIfSafe(accountsUrl)
    if (accountsOrigin) {
      origins.add(accountsOrigin)
    }
  }

  return origins
}

const isAccountsOrigin = (origin: string) => getAccountsOrigins().has(origin)

export const getAppNameFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('app') ?? 'OpenSe'
}

export const getReturnToFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  const returnTo = params.get('returnTo')

  if (returnTo && isSafeHttpUrl(returnTo)) {
    // Don't redirect back to accounts app - that causes a login loop
    const returnOrigin = getOriginIfSafe(returnTo)
    if (returnOrigin && isAccountsOrigin(returnOrigin)) {
      return ''
    }
    return returnTo
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
