const isSafeHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const accountsUrl = (import.meta.env.VITE_ACCOUNTS_URL as string | undefined) ?? ''
const defaultReturnTo = (import.meta.env.VITE_ETL_PUBLIC_URL as string | undefined) ?? ''

const getAccountsOrigins = () => {
  const origins = new Set<string>([window.location.origin])

  if (accountsUrl) {
    try {
      origins.add(new URL(accountsUrl).origin)
    } catch {}
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
    try {
      const returnOrigin = new URL(returnTo).origin
      if (isAccountsOrigin(returnOrigin)) {
        return getDefaultReturnTo()
      }
    } catch {}
    return returnTo
  }

  return getDefaultReturnTo()
}

function getDefaultReturnTo(): string {
  if (defaultReturnTo && isSafeHttpUrl(defaultReturnTo)) {
    try {
      const defaultOrigin = new URL(defaultReturnTo).origin
      if (!isAccountsOrigin(defaultOrigin)) {
        return `${defaultReturnTo.replace(/\/$/, '')}/dashboard`
      }
    } catch {}
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

export const redirectBackToApp = () => {
  const returnTo = getReturnToFromQuery()
  if (!returnTo) {
    return false
  }

  window.location.replace(returnTo)
  return true
}
