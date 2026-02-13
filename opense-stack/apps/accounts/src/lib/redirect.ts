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
      const accountsOrigin = accountsUrl ? new URL(accountsUrl).origin : window.location.origin
      if (returnOrigin === accountsOrigin) {
        return getDefaultReturnTo()
      }
    } catch {}
    return returnTo
  }

  return getDefaultReturnTo()
}

function getDefaultReturnTo(): string {
  if (defaultReturnTo) {
    return `${defaultReturnTo.replace(/\/$/, '')}/dashboard`
  }
  return `${window.location.origin}/`
}

export const buildQueryString = () => {
  const params = new URLSearchParams(window.location.search)
  const app = params.get('app')
  const returnTo = getReturnToFromQuery()

  const next = new URLSearchParams()
  next.set('returnTo', returnTo)
  if (app) {
    next.set('app', app)
  }

  return next.toString()
}

export const redirectBackToApp = () => {
  window.location.replace(getReturnToFromQuery())
}
