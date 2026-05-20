declare const Deno: {
  env: {
    get: (key: string) => string | undefined
  }
}

export type ChatAlertChannel = 'telegram' | 'mattermost'

export type ChatAlertPayload = {
  deliveryId: string
  companyId: string
  channel: ChatAlertChannel
  connectorId?: string | null
  targetId?: string | null
  targetName?: string | null
  targetType?: string | null
  providerTargetId?: string | null
  alert: {
    id: string
    type: string
    severity: string
    message: string
    triggeredAt: string
    productName?: string | null
    productSku?: string | null
    folderName?: string | null
    organisationName: string
  }
}

export type ChatDispatchResult = {
  messageId: string | null
}

const parseWebhookMap = (value: string | undefined): Record<string, string> => {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) return {}
    return Object.fromEntries(
      Object.entries(parsed).filter((entry): entry is [string, string] => typeof entry[1] === 'string'),
    )
  } catch {
    return {}
  }
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const formatAlertType = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

export const formatChatAlertMessage = (payload: ChatAlertPayload) => {
  const message = [
    `StoQR ${formatAlertType(payload.alert.type)} alert`,
    '',
    payload.alert.message,
    '',
    `Organisation: ${payload.alert.organisationName}`,
    payload.alert.productName
      ? `Product: ${payload.alert.productName}${payload.alert.productSku ? ` (${payload.alert.productSku})` : ''}`
      : null,
    payload.alert.folderName ? `Folder: ${payload.alert.folderName}` : null,
    `Severity: ${payload.alert.severity}`,
    `Triggered: ${new Date(payload.alert.triggeredAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`,
  ].filter(Boolean).join('\n')

  return payload.channel === 'mattermost' ? `@all ${message}` : message
}

const readResponseError = async (response: Response, fallback: string) => {
  const text = await response.text().catch(() => '')
  if (!text) return fallback
  try {
    const data = JSON.parse(text)
    return data.description ?? data.message ?? data.error ?? text
  } catch {
    return text
  }
}

const requireProviderTargetId = (payload: ChatAlertPayload) => {
  const providerTargetId = payload.providerTargetId?.trim()
  if (!providerTargetId) {
    throw new Error(`Missing ${payload.channel} provider target ID`)
  }
  return providerTargetId
}

const dispatchTelegram = async (
  payload: ChatAlertPayload,
  fetchImpl: typeof fetch,
): Promise<ChatDispatchResult> => {
  const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured')

  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: requireProviderTargetId(payload),
      text: formatChatAlertMessage(payload),
      disable_web_page_preview: true,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    throw new Error(data.description ?? 'Telegram dispatch failed')
  }

  return { messageId: data.result?.message_id ? String(data.result.message_id) : null }
}

const resolveMattermostWebhookUrl = (providerTargetId: string) => {
  if (/^https?:\/\//i.test(providerTargetId)) return providerTargetId
  return parseWebhookMap(Deno.env.get('MATTERMOST_WEBHOOKS_JSON'))[providerTargetId]
}

const resolveMattermostChannelId = (providerTargetId: string) => {
  if (!providerTargetId.startsWith('channel:')) return null
  return providerTargetId.replace(/^channel:/, '').trim()
}

const dispatchMattermost = async (
  payload: ChatAlertPayload,
  fetchImpl: typeof fetch,
): Promise<ChatDispatchResult> => {
  const providerTargetId = requireProviderTargetId(payload)
  const channelId = resolveMattermostChannelId(providerTargetId)

  if (channelId) {
    const baseUrl = Deno.env.get('MATTERMOST_BASE_URL')
    const botToken = Deno.env.get('MATTERMOST_BOT_TOKEN')
    if (!baseUrl || !botToken) {
      throw new Error('Mattermost bot API is not configured for channel targets')
    }

    const response = await fetchImpl(`${trimTrailingSlash(baseUrl)}/api/v4/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel_id: channelId,
        message: formatChatAlertMessage(payload),
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? 'Mattermost bot API dispatch failed')
    }

    return { messageId: typeof data.id === 'string' ? data.id : payload.deliveryId }
  }

  const webhookUrl = resolveMattermostWebhookUrl(providerTargetId)
  if (!webhookUrl) throw new Error('Mattermost webhook is not configured for target')

  const response = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: formatChatAlertMessage(payload) }),
  })

  if (!response.ok) {
    throw new Error(await readResponseError(response, 'Mattermost dispatch failed'))
  }

  return { messageId: payload.deliveryId }
}

export const dispatchChatAlert = async (
  payload: ChatAlertPayload,
  fetchImpl: typeof fetch = fetch,
): Promise<ChatDispatchResult> => {
  if (!payload.connectorId || !payload.targetId) {
    throw new Error(`Missing ${payload.channel} connector target metadata`)
  }

  if (payload.channel === 'telegram') {
    return dispatchTelegram(payload, fetchImpl)
  }

  return dispatchMattermost(payload, fetchImpl)
}
