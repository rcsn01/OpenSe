const DISCOVERY_PATH = '/.well-known/opense-desktop.json'

const isHttpUrl = (value) => {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const normalizeAccountsUrl = (value) => {
  if (typeof value !== 'string') {
    throw new Error('Accounts URL is required.')
  }

  const trimmed = value.trim().replace(/\/+$/, '')
  if (!isHttpUrl(trimmed)) {
    throw new Error('Accounts URL must be an http or https URL.')
  }

  return trimmed
}

const buildDiscoveryUrl = (accountsUrl) => {
  const normalized = normalizeAccountsUrl(accountsUrl)
  return `${normalized}${DISCOVERY_PATH}`
}

const validateDiscoveryConfig = (value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Discovery response must be a JSON object.')
  }

  if (value.version !== 1) {
    throw new Error('Unsupported discovery version.')
  }

  if (typeof value.supabaseUrl !== 'string' || !isHttpUrl(value.supabaseUrl)) {
    throw new Error('Discovery response must include a valid Supabase URL.')
  }

  if (
    typeof value.supabasePublishableKey !== 'string' ||
    value.supabasePublishableKey.trim().length === 0
  ) {
    throw new Error('Discovery response must include a Supabase publishable key.')
  }

  if (typeof value.googleAuthEnabled !== 'boolean') {
    throw new Error('Discovery response must include googleAuthEnabled.')
  }

  return {
    version: 1,
    instanceName:
      typeof value.instanceName === 'string' && value.instanceName.trim()
        ? value.instanceName.trim()
        : 'OpenSe',
    supabaseUrl: value.supabaseUrl.trim().replace(/\/+$/, ''),
    supabasePublishableKey: value.supabasePublishableKey.trim(),
    googleAuthEnabled: value.googleAuthEnabled,
  }
}

const validateStoredDesktopConfig = (value) => {
  if (!value || typeof value !== 'object') {
    throw new Error('Stored desktop config must be a JSON object.')
  }

  if (typeof value.accountsUrl !== 'string' || !isHttpUrl(value.accountsUrl)) {
    throw new Error('Stored desktop config has an invalid Accounts URL.')
  }

  return {
    ...value,
    accountsUrl: normalizeAccountsUrl(value.accountsUrl),
    discovery: validateDiscoveryConfig(value.discovery),
  }
}

const parseDiscoveryResponse = async (response, discoveryUrl) => {
  const contentType = response.headers.get('content-type') ?? ''
  const body = await response.text()
  const trimmedBody = body.trimStart()

  if (
    contentType.includes('text/html') ||
    trimmedBody.startsWith('<!doctype') ||
    trimmedBody.startsWith('<html')
  ) {
    throw new Error(
      `Discovery endpoint returned HTML instead of JSON. Ensure ${discoveryUrl} serves ${DISCOVERY_PATH}.`,
    )
  }

  try {
    return JSON.parse(body)
  } catch (error) {
    const message = error instanceof Error ? error.message : 'Invalid JSON'
    throw new Error(`Discovery endpoint returned invalid JSON: ${message}`)
  }
}

const fetchDiscoveryConfig = async (accountsUrl) => {
  const discoveryUrl = buildDiscoveryUrl(accountsUrl)
  const response = await fetch(discoveryUrl)
  if (!response.ok) {
    throw new Error(`Discovery request failed with HTTP ${response.status}.`)
  }

  return validateDiscoveryConfig(await parseDiscoveryResponse(response, discoveryUrl))
}

module.exports = {
  DISCOVERY_PATH,
  buildDiscoveryUrl,
  fetchDiscoveryConfig,
  normalizeAccountsUrl,
  parseDiscoveryResponse,
  validateDiscoveryConfig,
  validateStoredDesktopConfig,
}
