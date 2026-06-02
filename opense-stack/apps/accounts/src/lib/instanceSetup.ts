export const MOBILE_STORAGE_KEY = 'opense.mobile.config.v1'
export const DISCOVERY_PATH = '/.well-known/opense-desktop.json'

export type DiscoveryConfig = {
  version: 1
  instanceName: string
  supabaseUrl: string
  supabasePublishableKey: string
  googleAuthEnabled: boolean
}

export type StoredMobileConfig = {
  accountsUrl: string
  discovery: DiscoveryConfig
}

export const describeSetupError = (error: unknown) => {
  if (error instanceof Error) {
    return error.message
  }

  return String(error || 'Unknown error')
}

const isHttpUrl = (value: string) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

export const normalizeAccountsUrl = (value: string) => {
  const trimmed = value.trim().replace(/\/+$/, '')
  if (!isHttpUrl(trimmed)) {
    throw new Error('Accounts URL must be an http or https URL.')
  }

  return trimmed
}

export const buildDiscoveryUrl = (accountsUrl: string) =>
  `${normalizeAccountsUrl(accountsUrl)}${DISCOVERY_PATH}`

export const validateDiscoveryConfig = (value: unknown): DiscoveryConfig => {
  if (!value || typeof value !== 'object') {
    throw new Error('Discovery response must be a JSON object.')
  }

  const candidate = value as Record<string, unknown>
  if (candidate.version !== 1) {
    throw new Error('Unsupported discovery version.')
  }

  if (typeof candidate.supabaseUrl !== 'string' || !isHttpUrl(candidate.supabaseUrl)) {
    throw new Error('Discovery response must include a valid Supabase URL.')
  }

  if (
    typeof candidate.supabasePublishableKey !== 'string' ||
    candidate.supabasePublishableKey.trim().length === 0
  ) {
    throw new Error('Discovery response must include a Supabase publishable key.')
  }

  if (typeof candidate.googleAuthEnabled !== 'boolean') {
    throw new Error('Discovery response must include googleAuthEnabled.')
  }

  return {
    version: 1,
    instanceName:
      typeof candidate.instanceName === 'string' && candidate.instanceName.trim()
        ? candidate.instanceName.trim()
        : 'OpenSe',
    supabaseUrl: candidate.supabaseUrl.trim().replace(/\/+$/, ''),
    supabasePublishableKey: candidate.supabasePublishableKey.trim(),
    googleAuthEnabled: candidate.googleAuthEnabled,
  }
}

const parseDiscoveryResponse = async (response: Response, discoveryUrl: string) => {
  const contentType = response.headers.get('content-type') ?? 'unknown'
  const body = await response.text()
  const trimmedBody = body.trimStart()

  if (
    contentType.includes('text/html') ||
    trimmedBody.toLowerCase().startsWith('<!doctype') ||
    trimmedBody.toLowerCase().startsWith('<html')
  ) {
    throw new Error(
      `Discovery endpoint returned HTML instead of JSON. Ensure ${discoveryUrl} serves ${DISCOVERY_PATH}.`,
    )
  }

  try {
    return JSON.parse(body) as unknown
  } catch (error) {
    throw new Error(`Discovery endpoint returned invalid JSON: ${describeSetupError(error)}`)
  }
}

export const fetchDiscoveryConfig = async (accountsUrl: string) => {
  const discoveryUrl = buildDiscoveryUrl(accountsUrl)
  const response = await fetch(discoveryUrl)
  if (!response.ok) {
    throw new Error(`Discovery request failed with HTTP ${response.status}.`)
  }

  return validateDiscoveryConfig(await parseDiscoveryResponse(response, discoveryUrl))
}
