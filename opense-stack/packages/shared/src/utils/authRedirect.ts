export type AuthMode = 'signin' | 'signup'

interface BuildAccountsRedirectUrlOptions {
  accountsUrl: string
  appPublicUrl: string
  appName: string
  redirectPath?: string
}

interface BuildAccountsAuthUrlOptions extends BuildAccountsRedirectUrlOptions {
  mode: AuthMode
}

type BuildAccountsOnboardingUrlOptions = BuildAccountsRedirectUrlOptions

interface BuildAccountsSettingsUrlOptions {
  accountsUrl: string
}

interface CreateAccountsRedirectsConfig {
  accountsUrl: string
  appPublicUrl: string
  appName: string
  defaultRedirectPath?: string
}

interface AccountsRedirectOptions {
  redirectPath?: string
}

export interface AccountsReturnToValidationConfig {
  accountsUrl?: string
  allowedAppPublicUrls?: readonly (string | null | undefined)[]
  localAppReturnUrls?: readonly string[]
  currentOrigin?: string
  currentHostname?: string
  allowLocalAppOrigins?: boolean
}

export interface BuildAccountsForwardQueryOptions extends AccountsReturnToValidationConfig {
  search: string
}

const DEFAULT_REDIRECT_PATH = '/dashboard'

export const DEFAULT_LOCAL_APP_RETURN_URLS = [
  'http://localhost:5992',
  'http://localhost:5993',
  'http://localhost:5994',
  'http://localhost:5999',
] as const

const normalizeBaseUrl = (value: string) => value.replace(/\/+$/, '')

const normalizeRedirectPath = (value: string) => {
  if (!value) {
    return '/'
  }

  return value.startsWith('/') ? value : `/${value}`
}

const buildReturnTo = ({
  appPublicUrl,
  redirectPath = DEFAULT_REDIRECT_PATH,
}: Pick<BuildAccountsRedirectUrlOptions, 'appPublicUrl' | 'redirectPath'>) => {
  const normalizedAppPublicUrl = normalizeBaseUrl(appPublicUrl)
  return `${normalizedAppPublicUrl}${normalizeRedirectPath(redirectPath)}`
}

const buildAccountsUrl = ({
  accountsUrl,
  path,
  appPublicUrl,
  appName,
  redirectPath,
}: BuildAccountsRedirectUrlOptions & { path: string }) => {
  const normalizedAccountsUrl = normalizeBaseUrl(accountsUrl)
  const params = new URLSearchParams({
    app: appName,
    returnTo: buildReturnTo({ appPublicUrl, redirectPath }),
  })

  return `${normalizedAccountsUrl}${normalizeRedirectPath(path)}?${params.toString()}`
}

export const buildAccountsAuthUrl = ({
  mode,
  accountsUrl,
  appPublicUrl,
  appName,
  redirectPath = DEFAULT_REDIRECT_PATH,
}: BuildAccountsAuthUrlOptions): string => {
  return buildAccountsUrl({
    accountsUrl,
    appPublicUrl,
    appName,
    redirectPath,
    path: mode === 'signup' ? '/register' : '/login',
  })
}

export const buildAccountsOnboardingUrl = ({
  accountsUrl,
  appPublicUrl,
  appName,
  redirectPath = DEFAULT_REDIRECT_PATH,
}: BuildAccountsOnboardingUrlOptions): string => {
  return buildAccountsUrl({
    accountsUrl,
    appPublicUrl,
    appName,
    redirectPath,
    path: '/onboarding',
  })
}

export const buildAccountsSettingsUrl = ({ accountsUrl }: BuildAccountsSettingsUrlOptions): string => {
  const normalizedAccountsUrl = normalizeBaseUrl(accountsUrl)
  return `${normalizedAccountsUrl}/account/profile`
}

export const createAccountsRedirects = ({
  accountsUrl,
  appPublicUrl,
  appName,
  defaultRedirectPath = DEFAULT_REDIRECT_PATH,
}: CreateAccountsRedirectsConfig) => ({
  auth: (mode: AuthMode, options: AccountsRedirectOptions = {}) =>
    buildAccountsAuthUrl({
      mode,
      accountsUrl,
      appPublicUrl,
      appName,
      redirectPath: options.redirectPath ?? defaultRedirectPath,
    }),
  settings: () => buildAccountsSettingsUrl({ accountsUrl }),
  onboarding: (options: AccountsRedirectOptions = {}) =>
    buildAccountsOnboardingUrl({
      accountsUrl,
      appPublicUrl,
      appName,
      redirectPath: options.redirectPath ?? defaultRedirectPath,
    }),
})

const isSafeHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

const getOriginIfSafe = (value: string): string | null => {
  if (!isSafeHttpUrl(value)) {
    return null
  }

  return new URL(value).origin
}

const getAccountsOrigins = ({
  accountsUrl,
  currentOrigin,
}: Pick<AccountsReturnToValidationConfig, 'accountsUrl' | 'currentOrigin'>) => {
  const origins = new Set<string>()

  if (currentOrigin) {
    origins.add(currentOrigin)
  }

  if (accountsUrl) {
    const accountsOrigin = getOriginIfSafe(accountsUrl)
    if (accountsOrigin) {
      origins.add(accountsOrigin)
    }
  }

  return origins
}

const getAllowedReturnOrigins = ({
  accountsUrl,
  allowedAppPublicUrls = [],
  localAppReturnUrls = DEFAULT_LOCAL_APP_RETURN_URLS,
  currentOrigin,
  currentHostname,
  allowLocalAppOrigins = false,
}: AccountsReturnToValidationConfig) => {
  const accountsOrigins = getAccountsOrigins({ accountsUrl, currentOrigin })
  const origins = new Set<string>()

  for (const value of allowedAppPublicUrls) {
    const origin = value ? getOriginIfSafe(value) : null
    if (origin && !accountsOrigins.has(origin)) {
      origins.add(origin)
    }
  }

  const isLocalAccountsHost = currentHostname === 'localhost' || currentHostname === '127.0.0.1'
  if (allowLocalAppOrigins || isLocalAccountsHost) {
    for (const value of localAppReturnUrls) {
      const origin = getOriginIfSafe(value)
      if (origin && !accountsOrigins.has(origin)) {
        origins.add(origin)
      }
    }
  }

  return origins
}

export const isSafeAccountsReturnTo = (
  value: string,
  config: AccountsReturnToValidationConfig,
) => {
  const returnOrigin = getOriginIfSafe(value)
  if (!returnOrigin) {
    return false
  }

  const accountsOrigins = getAccountsOrigins(config)
  if (accountsOrigins.has(returnOrigin)) {
    return false
  }

  return getAllowedReturnOrigins(config).has(returnOrigin)
}

export const getSafeAccountsReturnTo = (
  value: string | null | undefined,
  config: AccountsReturnToValidationConfig,
) => {
  if (!value) {
    return ''
  }

  return isSafeAccountsReturnTo(value, config) ? value : ''
}

export const buildAccountsForwardQuery = ({
  search,
  ...config
}: BuildAccountsForwardQueryOptions) => {
  const params = new URLSearchParams(search)
  const app = params.get('app')
  const returnTo = getSafeAccountsReturnTo(params.get('returnTo'), config)

  const next = new URLSearchParams()
  if (returnTo) {
    next.set('returnTo', returnTo)
  }
  if (app) {
    next.set('app', app)
  }

  return next.toString()
}
