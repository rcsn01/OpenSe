const isSafeHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export const getAppNameFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  return params.get('app') ?? 'OpenSe'
}

export const getReturnToFromQuery = () => {
  const params = new URLSearchParams(window.location.search)
  const returnTo = params.get('returnTo')

  if (!returnTo || !isSafeHttpUrl(returnTo)) {
    return `${window.location.origin}/`
  }

  return returnTo
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
