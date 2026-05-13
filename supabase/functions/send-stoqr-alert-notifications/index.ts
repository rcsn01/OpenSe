// @ts-ignore Deno edge runtime resolves npm modules at deploy/runtime.
import nodemailer from 'npm:nodemailer@6.9.16'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type AlertChannel = 'email' | 'telegram' | 'mattermost' | 'whatsapp'

type PendingAlertNotification = {
  delivery_id: string
  company_id: string
  alert_event_id: string
  channel: AlertChannel
  recipient: string
  connector_id: string | null
  connector_provider: AlertChannel | null
  target_id: string | null
  target_name: string | null
  target_type: string | null
  provider_target_id: string | null
  alert_type: string
  severity: string
  message: string
  triggered_at: string
  product_name: string | null
  product_sku: string | null
  organisation_name: string
}

type DispatchRequestBody = {
  batchSize: number
  companyId: string | null
}

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

const parseTimeout = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const describeError = (error: unknown) => {
  if (!(error instanceof Error)) return 'Unknown alert notification delivery error'

  const providerError = error as Error & {
    code?: string
    command?: string
    response?: string
    responseCode?: number
    syscall?: string
  }

  return [
    providerError.message,
    providerError.code ? `code=${providerError.code}` : null,
    providerError.command ? `command=${providerError.command}` : null,
    providerError.responseCode ? `responseCode=${providerError.responseCode}` : null,
    providerError.response ? `response=${providerError.response}` : null,
    providerError.syscall ? `syscall=${providerError.syscall}` : null,
  ].filter(Boolean).join(' | ')
}

const parseBody = async (req: Request): Promise<DispatchRequestBody> => {
  const body = await req.json().catch(() => ({})) as Record<string, unknown>
  const raw = typeof body.batchSize === 'number' ? body.batchSize : Number(body.batchSize ?? 25)
  const batchSize = Number.isFinite(raw) ? Math.min(Math.max(Math.trunc(raw), 1), 100) : 25
  const companyId = typeof body.companyId === 'string' && body.companyId.trim() ? body.companyId.trim() : null

  return { batchSize, companyId }
}

const hasDispatchToken = (req: Request, dispatchToken: string | undefined) => {
  const providedDispatchToken = req.headers.get('x-alert-dispatch-token')?.trim()
  return Boolean(dispatchToken) && providedDispatchToken === dispatchToken
}

const hasServiceRoleToken = (req: Request, serviceRoleKey: string) => {
  const authToken = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '').trim()
  return authToken === serviceRoleKey
}

const userCanDispatchForCompany = async (
  req: Request,
  supabaseUrl: string,
  supabaseAnonKey: string,
  companyId: string,
) => {
  const authHeader = req.headers.get('Authorization')
  if (!authHeader) return false

  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/has_permission`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: supabaseAnonKey,
      Authorization: authHeader,
    },
    body: JSON.stringify({
      _company_id: companyId,
      _permission_code: 'alerts.manage',
    }),
  })

  if (!response.ok) return false
  return Boolean(await response.json().catch(() => false))
}

const rpc = async <T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  rpcName: string,
  body: Record<string, unknown>,
): Promise<T> => {
  const response = await fetch(`${supabaseUrl}/rest/v1/rpc/${rpcName}`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
    },
    body: JSON.stringify(body),
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? `RPC ${rpcName} failed`)
  }

  return data as T
}

const escapeHtml = (value: string) =>
  value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const formatAlertType = (value: string) =>
  value
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ')

const buildSubject = (alert: PendingAlertNotification) => {
  const product = alert.product_name ? `: ${alert.product_name}` : ''
  return `[StoQR] ${formatAlertType(alert.alert_type)} alert${product}`
}

const buildText = (alert: PendingAlertNotification) => [
  `${formatAlertType(alert.alert_type)} alert`,
  '',
  alert.message,
  '',
  `Organisation: ${alert.organisation_name}`,
  alert.product_name ? `Product: ${alert.product_name}${alert.product_sku ? ` (${alert.product_sku})` : ''}` : null,
  `Severity: ${alert.severity}`,
  `Triggered: ${new Date(alert.triggered_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`,
].filter(Boolean).join('\n')

const buildHtml = (alert: PendingAlertNotification) => {
  const product = alert.product_name
    ? `<p><strong>Product:</strong> ${escapeHtml(alert.product_name)}${alert.product_sku ? ` (${escapeHtml(alert.product_sku)})` : ''}</p>`
    : ''

  return `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.5; color: #111827;">
      <h2 style="margin: 0 0 12px;">${escapeHtml(formatAlertType(alert.alert_type))} alert</h2>
      <p>${escapeHtml(alert.message)}</p>
      <p><strong>Organisation:</strong> ${escapeHtml(alert.organisation_name)}</p>
      ${product}
      <p><strong>Severity:</strong> ${escapeHtml(alert.severity)}</p>
      <p><strong>Triggered:</strong> ${escapeHtml(new Date(alert.triggered_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' }))}</p>
    </div>
  `
}

const createMailTransporter = (smtpPort: number) => nodemailer.createTransport({
  host: Deno.env.get('ALERT_SMTP_PUBLIC_HOST') ?? Deno.env.get('ALERT_SMTP_HOST'),
  port: smtpPort,
  secure: parseBoolean(Deno.env.get('ALERT_SMTP_PUBLIC_SECURE') ?? Deno.env.get('ALERT_SMTP_SECURE'), smtpPort === 465),
  ignoreTLS: parseBoolean(Deno.env.get('ALERT_SMTP_IGNORE_TLS'), false),
  requireTLS: parseBoolean(Deno.env.get('ALERT_SMTP_REQUIRE_TLS'), false),
  connectionTimeout: parseTimeout(Deno.env.get('ALERT_SMTP_CONNECTION_TIMEOUT_MS'), 10_000),
  greetingTimeout: parseTimeout(Deno.env.get('ALERT_SMTP_GREETING_TIMEOUT_MS'), 10_000),
  socketTimeout: parseTimeout(Deno.env.get('ALERT_SMTP_SOCKET_TIMEOUT_MS'), 15_000),
  tls: {
    rejectUnauthorized: parseBoolean(Deno.env.get('ALERT_SMTP_TLS_REJECT_UNAUTHORIZED'), true),
    servername: Deno.env.get('ALERT_SMTP_TLS_SERVERNAME')?.trim() || undefined,
  },
  auth: Deno.env.get('ALERT_SMTP_USER') && Deno.env.get('ALERT_SMTP_PASS')
    ? { user: Deno.env.get('ALERT_SMTP_USER'), pass: Deno.env.get('ALERT_SMTP_PASS') }
    : undefined,
  logger: parseBoolean(Deno.env.get('ALERT_SMTP_DEBUG'), false),
  debug: parseBoolean(Deno.env.get('ALERT_SMTP_DEBUG'), false),
})

const sendGatewayNotification = async (alert: PendingAlertNotification) => {
  if (alert.channel === 'mattermost' && alert.provider_target_id && /^https?:\/\//i.test(alert.provider_target_id)) {
    const response = await fetch(alert.provider_target_id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ text: buildText(alert) }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || 'Mattermost webhook dispatch failed')
    }

    return alert.delivery_id
  }

  const gatewayUrl = Deno.env.get('CONNECTOR_GATEWAY_URL')?.replace(/\/$/, '')
  const gatewayToken = Deno.env.get('CONNECTOR_GATEWAY_TOKEN')

  if (!gatewayUrl || !gatewayToken) {
    throw new Error('Connector gateway environment is not configured')
  }

  if (!alert.connector_id || !alert.target_id || !alert.provider_target_id) {
    throw new Error(`Missing ${alert.channel} connector target metadata`)
  }

  const response = await fetch(`${gatewayUrl}/dispatch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deliveryId: alert.delivery_id,
      companyId: alert.company_id,
      channel: alert.channel,
      connectorId: alert.connector_id,
      targetId: alert.target_id,
      targetName: alert.target_name,
      targetType: alert.target_type,
      providerTargetId: alert.provider_target_id,
      alert: {
        id: alert.alert_event_id,
        type: alert.alert_type,
        severity: alert.severity,
        message: alert.message,
        triggeredAt: alert.triggered_at,
        productName: alert.product_name,
        productSku: alert.product_sku,
        organisationName: alert.organisation_name,
        text: buildText(alert),
      },
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error ?? `${alert.channel} connector dispatch failed`)
  }

  return data?.messageId ?? null
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req)
  }

  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const supabaseAnonKey = Deno.env.get('SUPABASE_ANON_KEY')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const dispatchToken =
    Deno.env.get('STOQR_ALERT_DISPATCH_TOKEN') ?? Deno.env.get('ALERT_EMAIL_DISPATCH_TOKEN')
  const smtpHost = Deno.env.get('ALERT_SMTP_PUBLIC_HOST') ?? Deno.env.get('ALERT_SMTP_HOST')
  const smtpPort = Number(Deno.env.get('ALERT_SMTP_PUBLIC_PORT') ?? Deno.env.get('ALERT_SMTP_PORT') ?? 587)
  const from = Deno.env.get('ALERT_MAIL_FROM')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(req, 500, { error: 'Supabase environment is not configured' })
  }

  const { batchSize, companyId } = await parseBody(req)
  if (!companyId) {
    return json(req, 400, { error: 'companyId is required' })
  }

  const authorized =
    hasServiceRoleToken(req, serviceRoleKey) ||
    hasDispatchToken(req, dispatchToken) ||
    await userCanDispatchForCompany(req, supabaseUrl, supabaseAnonKey, companyId)

  if (!authorized) {
    return json(req, 401, { error: 'Unauthorized' })
  }

  const alerts = await rpc<PendingAlertNotification[]>(supabaseUrl, serviceRoleKey, 'claim_stoqr_pending_alert_notifications', {
    target_company_id: companyId,
    batch_size: batchSize,
  })

  const mailTransporter = alerts.some((alert) => alert.channel === 'email')
    ? createMailTransporter(smtpPort)
    : null

  if (mailTransporter && (!smtpHost || !from || !Number.isFinite(smtpPort))) {
    return json(req, 500, { error: 'Alert mail SMTP environment is not configured' })
  }

  const results = []

  for (const alert of alerts) {
    try {
      let providerMessageId: string | null = null

      if (alert.channel === 'email') {
        const info = await mailTransporter!.sendMail({
          from,
          to: alert.recipient,
          subject: buildSubject(alert),
          text: buildText(alert),
          html: buildHtml(alert),
        })
        providerMessageId = info.messageId ?? null
      } else {
        providerMessageId = await sendGatewayNotification(alert)
      }

      await rpc(supabaseUrl, serviceRoleKey, 'mark_stoqr_alert_notification_delivery', {
        target_delivery_id: alert.delivery_id,
        next_status: 'sent',
        provider_message_id: providerMessageId,
        error_message: null,
      })

      results.push({ deliveryId: alert.delivery_id, channel: alert.channel, recipient: alert.recipient, status: 'sent' })
    } catch (error) {
      const message = describeError(error)
      console.error('StoQR alert notification delivery failed', message)

      await rpc(supabaseUrl, serviceRoleKey, 'mark_stoqr_alert_notification_delivery', {
        target_delivery_id: alert.delivery_id,
        next_status: 'failed',
        provider_message_id: null,
        error_message: message,
      })

      results.push({ deliveryId: alert.delivery_id, channel: alert.channel, recipient: alert.recipient, status: 'failed', error: message })
    }
  }

  return json(req, 200, {
    claimed: alerts.length,
    sent: results.filter((row) => row.status === 'sent').length,
    failed: results.filter((row) => row.status === 'failed').length,
    results,
  })
})
