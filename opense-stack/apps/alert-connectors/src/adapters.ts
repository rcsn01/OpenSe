export type AlertProvider = 'telegram' | 'mattermost' | 'whatsapp'

export type DispatchPayload = {
  deliveryId: string
  companyId: string
  channel: AlertProvider
  connectorId: string
  targetId: string
  targetName?: string | null
  targetType?: string | null
  providerTargetId: string
  alert: {
    id: string
    type: string
    severity: string
    message: string
    triggeredAt: string
    productName?: string | null
    productSku?: string | null
    organisationName: string
    text: string
  }
}

export type DispatchResult = {
  messageId: string | null
}

export type MattermostDispatchConfig = {
  webhookMapJson?: string
  baseUrl?: string
  botToken?: string
}

export const formatChatMessage = (payload: DispatchPayload) => {
  const product = payload.alert.productName
    ? `\nProduct: ${payload.alert.productName}${payload.alert.productSku ? ` (${payload.alert.productSku})` : ''}`
    : ''

  return [
    `StoQR ${payload.alert.type.replace(/_/g, ' ')} alert`,
    payload.alert.message,
    `Organisation: ${payload.alert.organisationName}`,
    `Severity: ${payload.alert.severity}`,
    `Triggered: ${new Date(payload.alert.triggeredAt).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`,
  ].join('\n') + product
}

export const dispatchTelegram = async (
  payload: DispatchPayload,
  botToken: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<DispatchResult> => {
  if (!botToken) throw new Error('TELEGRAM_BOT_TOKEN is not configured')

  const response = await fetchImpl(`https://api.telegram.org/bot${botToken}/sendMessage`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      chat_id: payload.providerTargetId,
      text: formatChatMessage(payload),
      disable_web_page_preview: true,
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok || data.ok === false) {
    throw new Error(data.description ?? 'Telegram dispatch failed')
  }

  return { messageId: data.result?.message_id ? String(data.result.message_id) : null }
}

const parseWebhookMap = (value: string | undefined): Record<string, string> => {
  if (!value) return {}
  try {
    const parsed = JSON.parse(value)
    return typeof parsed === 'object' && parsed ? parsed as Record<string, string> : {}
  } catch {
    return {}
  }
}

export const resolveMattermostWebhookUrl = (
  providerTargetId: string,
  webhookMapJson: string | undefined,
) => {
  if (/^https?:\/\//i.test(providerTargetId)) return providerTargetId
  return parseWebhookMap(webhookMapJson)[providerTargetId]
}

const resolveMattermostChannelId = (providerTargetId: string) => {
  if (providerTargetId.startsWith('channel:')) {
    return providerTargetId.replace(/^channel:/, '').trim()
  }
  return null
}

const trimTrailingSlash = (value: string) => value.replace(/\/+$/, '')

const readResponseError = async (response: Response, fallback: string) => {
  const text = await response.text().catch(() => '')
  if (!text) return fallback
  try {
    const data = JSON.parse(text)
    return data.message ?? data.error ?? text
  } catch {
    return text
  }
}

export const dispatchMattermost = async (
  payload: DispatchPayload,
  config: MattermostDispatchConfig | string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<DispatchResult> => {
  const mattermostConfig =
    typeof config === 'string' || typeof config === 'undefined'
      ? { webhookMapJson: config }
      : config

  const channelId = resolveMattermostChannelId(payload.providerTargetId)
  if (channelId) {
    if (!mattermostConfig.baseUrl || !mattermostConfig.botToken) {
      throw new Error('Mattermost bot API is not configured for channel targets')
    }

    const response = await fetchImpl(`${trimTrailingSlash(mattermostConfig.baseUrl)}/api/v4/posts`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${mattermostConfig.botToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        channel_id: channelId,
        message: formatChatMessage(payload),
      }),
    })

    const data = await response.json().catch(() => ({}))
    if (!response.ok) {
      throw new Error(data.message ?? data.error ?? 'Mattermost bot API dispatch failed')
    }

    return { messageId: typeof data.id === 'string' ? data.id : payload.deliveryId }
  }

  const webhookUrl = resolveMattermostWebhookUrl(payload.providerTargetId, mattermostConfig.webhookMapJson)
  if (!webhookUrl) throw new Error('Mattermost webhook is not configured for target')

  const response = await fetchImpl(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ text: formatChatMessage(payload) }),
  })

  if (!response.ok) {
    throw new Error(await readResponseError(response, 'Mattermost dispatch failed'))
  }

  return { messageId: payload.deliveryId }
}
