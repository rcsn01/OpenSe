const encoder = new TextEncoder()

export const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

export const redirect = (location: string) =>
  new Response(null, {
    status: 302,
    headers: { Location: location },
  })

const base64Url = (value: string) =>
  btoa(value).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/g, '')

const fromBase64Url = (value: string) => {
  const padded = `${value}${'='.repeat((4 - value.length % 4) % 4)}`
  return atob(padded.replace(/-/g, '+').replace(/_/g, '/'))
}

export const hex = (buffer: ArrayBuffer) =>
  [...new Uint8Array(buffer)].map((byte) => byte.toString(16).padStart(2, '0')).join('')

export const timingSafeEqual = (left: string, right: string) => {
  if (left.length !== right.length) return false
  let result = 0
  for (let index = 0; index < left.length; index += 1) {
    result |= left.charCodeAt(index) ^ right.charCodeAt(index)
  }
  return result === 0
}

export const hmacHex = async (value: string, secret: string) => {
  const key = await crypto.subtle.importKey(
    'raw',
    encoder.encode(secret),
    { name: 'HMAC', hash: 'SHA-256' },
    false,
    ['sign'],
  )
  return hex(await crypto.subtle.sign('HMAC', key, encoder.encode(value)))
}

export const sha256Hex = async (value: string) =>
  hex(await crypto.subtle.digest('SHA-256', encoder.encode(value)))

export const createSignedState = async (payload: object, secret: string) => {
  const encoded = base64Url(JSON.stringify(payload))
  return `${encoded}.${await hmacHex(encoded, secret)}`
}

export const verifySignedState = async <T extends { exp?: number }>(
  state: string,
  secret: string,
): Promise<T> => {
  const [encoded, signature] = state.split('.')
  if (!encoded || !signature) throw new Error('Invalid OAuth state')
  const expected = await hmacHex(encoded, secret)
  if (!timingSafeEqual(expected, signature)) throw new Error('Invalid OAuth state signature')
  const payload = JSON.parse(fromBase64Url(encoded)) as T
  if (!payload.exp || payload.exp < Date.now()) throw new Error('OAuth state expired')
  return payload
}

const bytesToBase64 = (bytes: Uint8Array) =>
  btoa([...bytes].map((byte) => String.fromCharCode(byte)).join(''))

const base64ToBytes = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

const importCredentialKey = async (secret: string, usages: KeyUsage[]) => {
  const material = secret.startsWith('base64:')
    ? base64ToBytes(secret.slice('base64:'.length))
    : encoder.encode(secret)
  const keyBytes = material.length === 32
    ? material
    : new Uint8Array(await crypto.subtle.digest('SHA-256', material))
  return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, usages)
}

export const encryptCredential = async (value: string, secret: string, keyVersion: string) => {
  const key = await importCredentialKey(secret, ['encrypt'])
  const iv = crypto.getRandomValues(new Uint8Array(12))
  const ciphertext = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, encoder.encode(value))
  return `${keyVersion}.${bytesToBase64(iv)}.${bytesToBase64(new Uint8Array(ciphertext))}`
}

export const restFetch = async <T>(
  supabaseUrl: string,
  key: string,
  path: string,
  init: RequestInit = {},
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: key,
      Authorization: `Bearer ${key}`,
      'Accept-Profile': 'kb',
      'Content-Profile': 'kb',
      ...(init.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.code ? `${data.code}: ${data.message}` : data?.message ?? data?.error ?? `Request failed: ${path}`)
  }
  return data as T
}

export const verifyHmacSignature = async ({
  rawBody,
  signature,
  secret,
  expectedPrefix,
  signedPayload,
}: {
  rawBody: string
  signature: string | null
  secret: string
  expectedPrefix: string
  signedPayload?: string
}) => {
  if (!signature?.startsWith(expectedPrefix)) return false
  const expected = `${expectedPrefix}${await hmacHex(signedPayload ?? rawBody, secret)}`
  return timingSafeEqual(expected, signature)
}
