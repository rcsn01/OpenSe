// @ts-ignore Deno edge runtime resolves npm modules at deploy/runtime.
import nodemailer from 'npm:nodemailer@6.9.16'
import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type PendingEmailAlert = {
  delivery_id: string
  company_id: string
  alert_event_id: string
  recipient_email: string
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

const buildSubject = (alert: PendingEmailAlert) => {
  const product = alert.product_name ? `: ${alert.product_name}` : ''
  return `[StoQR] ${formatAlertType(alert.alert_type)} alert${product}`
}

const buildText = (alert: PendingEmailAlert) => [
  `${formatAlertType(alert.alert_type)} alert`,
  '',
  alert.message,
  '',
  `Organisation: ${alert.organisation_name}`,
  alert.product_name ? `Product: ${alert.product_name}${alert.product_sku ? ` (${alert.product_sku})` : ''}` : null,
  `Severity: ${alert.severity}`,
  `Triggered: ${new Date(alert.triggered_at).toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`,
].filter(Boolean).join('\n')

const buildHtml = (alert: PendingEmailAlert) => {
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
  const dispatchToken = Deno.env.get('ALERT_EMAIL_DISPATCH_TOKEN')
  const smtpHost = Deno.env.get('ALERT_SMTP_HOST')
  const smtpPort = Number(Deno.env.get('ALERT_SMTP_PORT') ?? 587)
  const smtpUser = Deno.env.get('ALERT_SMTP_USER')
  const smtpPass = Deno.env.get('ALERT_SMTP_PASS')
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

  if (!smtpHost || !from || !Number.isFinite(smtpPort)) {
    return json(req, 500, { error: 'Alert mail SMTP environment is not configured' })
  }

  const alerts = await rpc<PendingEmailAlert[]>(supabaseUrl, serviceRoleKey, 'claim_stoqr_pending_email_alerts', {
    target_company_id: companyId,
    batch_size: batchSize,
  })

  const transporter = nodemailer.createTransport({
    host: smtpHost,
    port: smtpPort,
    secure: parseBoolean(Deno.env.get('ALERT_SMTP_SECURE'), smtpPort === 465),
    ignoreTLS: parseBoolean(Deno.env.get('ALERT_SMTP_IGNORE_TLS'), false),
    requireTLS: parseBoolean(Deno.env.get('ALERT_SMTP_REQUIRE_TLS'), false),
    connectionTimeout: parseTimeout(Deno.env.get('ALERT_SMTP_CONNECTION_TIMEOUT_MS'), 10_000),
    greetingTimeout: parseTimeout(Deno.env.get('ALERT_SMTP_GREETING_TIMEOUT_MS'), 10_000),
    socketTimeout: parseTimeout(Deno.env.get('ALERT_SMTP_SOCKET_TIMEOUT_MS'), 15_000),
    auth: smtpUser && smtpPass ? { user: smtpUser, pass: smtpPass } : undefined,
  })

  const results = []

  for (const alert of alerts) {
    try {
      const info = await transporter.sendMail({
        from,
        to: alert.recipient_email,
        subject: buildSubject(alert),
        text: buildText(alert),
        html: buildHtml(alert),
      })

      await rpc(supabaseUrl, serviceRoleKey, 'mark_stoqr_alert_email_delivery', {
        target_delivery_id: alert.delivery_id,
        next_status: 'sent',
        provider_message_id: info.messageId ?? null,
        error_message: null,
      })

      results.push({ deliveryId: alert.delivery_id, recipient: alert.recipient_email, status: 'sent' })
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Unknown email delivery error'

      await rpc(supabaseUrl, serviceRoleKey, 'mark_stoqr_alert_email_delivery', {
        target_delivery_id: alert.delivery_id,
        next_status: 'failed',
        provider_message_id: null,
        error_message: message,
      })

      results.push({ deliveryId: alert.delivery_id, recipient: alert.recipient_email, status: 'failed', error: message })
    }
  }

  return json(req, 200, {
    claimed: alerts.length,
    sent: results.filter((row) => row.status === 'sent').length,
    failed: results.filter((row) => row.status === 'failed').length,
    results,
  })
})
