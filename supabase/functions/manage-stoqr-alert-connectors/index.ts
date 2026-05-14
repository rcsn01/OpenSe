import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
// @ts-ignore Deno edge runtime resolves npm modules at deploy/runtime.
import nodemailer from 'npm:nodemailer@6.9.16'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type ConnectorRequestBody = {
  action?: string
  companyId?: string
  connectorId?: string
  targetId?: string
  roleIds?: string[]
}

type AlertConnectorTargetRow = {
  id: string
  connector_id: string
  target_type: string
  target_name: string
  provider_target_id: string
  enabled: boolean
}

type AlertConnectorRow = {
  id: string
  company_id: string
  provider: 'telegram' | 'mattermost' | 'whatsapp'
  display_name: string
  status: 'disconnected' | 'pairing' | 'connected' | 'error'
}

type ProfileRow = {
  id: string
  email: string | null
}

type OrganisationMemberRoleRow = {
  user_id: string
}

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })

const parseBody = async (req: Request): Promise<ConnectorRequestBody> =>
  await req.json().catch(() => ({})) as ConnectorRequestBody

const parseBoolean = (value: string | undefined, fallback: boolean) => {
  if (value == null || value.trim() === '') return fallback
  return ['1', 'true', 'yes', 'on'].includes(value.trim().toLowerCase())
}

const parseTimeout = (value: string | undefined, fallback: number) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback
}

const restFetch = async <T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  schema: 'public' | 'stoqr',
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      ...(schema === 'stoqr' ? { 'Accept-Profile': 'stoqr' } : {}),
    },
  })

  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new Error(data?.message ?? data?.error ?? `Failed to fetch ${path}`)
  }

  return data as T
}

const userCanManageAlerts = async (
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

const updateConnectorStatus = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  connectorId: string,
  payload: Record<string, unknown>,
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/alert_connectors?id=eq.${connectorId}`, {
    method: 'PATCH',
    headers: {
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Content-Type': 'application/json',
      'Content-Profile': 'stoqr',
      Prefer: 'return=minimal',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.message ?? 'Failed to update connector status')
  }
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

const sendConnectorTest = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  gatewayUrl: string | undefined,
  gatewayToken: string | undefined,
  companyId: string,
  targetId: string,
) => {
  const targets = await restFetch<AlertConnectorTargetRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `alert_connector_targets?id=eq.${encodeURIComponent(targetId)}&select=id,connector_id,target_type,target_name,provider_target_id,enabled`,
    'stoqr',
  )
  const target = targets[0]
  if (!target || !target.enabled) throw new Error('Connector target is not enabled')

  const connectors = await restFetch<AlertConnectorRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `alert_connectors?id=eq.${encodeURIComponent(target.connector_id)}&company_id=eq.${encodeURIComponent(companyId)}&select=id,company_id,provider,display_name,status`,
    'stoqr',
  )
  const connector = connectors[0]
  if (!connector) throw new Error('Connector was not found for this organisation')
  if (connector.status !== 'connected') throw new Error(`${connector.display_name} is not connected`)

  if (connector.provider === 'mattermost' && /^https?:\/\//i.test(target.provider_target_id)) {
    const response = await fetch(target.provider_target_id, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        text: [
          '@all StoQR integration test',
          '',
          `Target: ${target.target_name}`,
          `Sent: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`,
        ].join('\n'),
      }),
    })

    if (!response.ok) {
      const text = await response.text().catch(() => '')
      throw new Error(text || 'Mattermost webhook test failed')
    }

    return { provider: connector.provider, targetName: target.target_name, messageId: target.id }
  }

  if (!gatewayUrl || !gatewayToken) {
    throw new Error('Connector gateway environment is not configured')
  }

  const testMessage = connector.provider === 'mattermost'
    ? `@all StoQR test message for ${target.target_name}.`
    : `StoQR test message for ${target.target_name}.`

  const response = await fetch(`${gatewayUrl}/dispatch`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      deliveryId: `test-${crypto.randomUUID()}`,
      companyId,
      channel: connector.provider,
      connectorId: connector.id,
      targetId: target.id,
      targetName: target.target_name,
      targetType: target.target_type,
      providerTargetId: target.provider_target_id,
      alert: {
        id: `test-${crypto.randomUUID()}`,
        type: 'integration_test',
        severity: 'low',
        message: testMessage,
        triggeredAt: new Date().toISOString(),
        productName: null,
        productSku: null,
        organisationName: 'StoQR',
        text: testMessage,
      },
    }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    throw new Error(data?.error ?? `${connector.provider} test dispatch failed`)
  }

  return { provider: connector.provider, targetName: target.target_name, messageId: data?.messageId ?? null }
}

const sendEmailTest = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  companyId: string,
  roleIds: string[],
) => {
  const uniqueRoleIds = [...new Set(roleIds.filter(Boolean))]
  if (uniqueRoleIds.length === 0) throw new Error('Select at least one role before testing email')

  const roleFilter = uniqueRoleIds.map((roleId) => `"${roleId}"`).join(',')
  const memberRows = await restFetch<OrganisationMemberRoleRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `organisation_member_roles?company_id=eq.${encodeURIComponent(companyId)}&role_id=in.(${roleFilter})&select=user_id`,
    'stoqr',
  )
  const userIds = [...new Set(memberRows.map((row) => row.user_id).filter(Boolean))]
  if (userIds.length === 0) throw new Error('No members were found for the selected roles')

  const userFilter = userIds.map((userId) => `"${userId}"`).join(',')
  const profileRows = await restFetch<ProfileRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `profiles?id=in.(${userFilter})&select=id,email`,
    'public',
  )
  const recipients = [...new Set(profileRows.map((profile) => profile.email).filter((email): email is string => Boolean(email)))]
  if (recipients.length === 0) throw new Error('Selected role members do not have email addresses')

  const smtpHost = Deno.env.get('ALERT_SMTP_PUBLIC_HOST') ?? Deno.env.get('ALERT_SMTP_HOST')
  const smtpPort = Number(Deno.env.get('ALERT_SMTP_PUBLIC_PORT') ?? Deno.env.get('ALERT_SMTP_PORT') ?? 587)
  const from = Deno.env.get('ALERT_MAIL_FROM')
  if (!smtpHost || !from || !Number.isFinite(smtpPort)) {
    throw new Error('Alert mail SMTP environment is not configured')
  }

  const info = await createMailTransporter(smtpPort).sendMail({
    from,
    to: recipients,
    subject: '[StoQR] Test alert notification',
    text: [
      'StoQR test alert notification',
      '',
      'This confirms email alert delivery is configured for this organisation.',
      `Sent: ${new Date().toLocaleString('en-AU', { timeZone: 'Australia/Sydney' })}`,
    ].join('\n'),
  })

  return { recipients, messageId: info.messageId ?? null }
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
  const gatewayUrl = Deno.env.get('CONNECTOR_GATEWAY_URL')?.replace(/\/$/, '')
  const gatewayToken = Deno.env.get('CONNECTOR_GATEWAY_TOKEN')

  if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
    return json(req, 500, { error: 'Supabase environment is not configured' })
  }

  const { action, companyId, connectorId, targetId, roleIds } = await parseBody(req)
  if (!companyId) {
    return json(req, 400, { error: 'companyId is required' })
  }

  if (!await userCanManageAlerts(req, supabaseUrl, supabaseAnonKey, companyId)) {
    return json(req, 401, { error: 'Unauthorized' })
  }

  if (action === 'test_connector_target') {
    if (!targetId) {
      return json(req, 400, { error: 'targetId is required' })
    }

    try {
      return json(req, 200, await sendConnectorTest(supabaseUrl, serviceRoleKey, gatewayUrl, gatewayToken, companyId, targetId))
    } catch (error) {
      return json(req, 500, { error: error instanceof Error ? error.message : 'Connector integration test failed' })
    }
  }

  if (action === 'test_email_recipients') {
    try {
      return json(req, 200, await sendEmailTest(supabaseUrl, serviceRoleKey, companyId, roleIds ?? []))
    } catch (error) {
      return json(req, 500, { error: error instanceof Error ? error.message : 'Email integration test failed' })
    }
  }

  if (action !== 'start_whatsapp_pairing') {
    return json(req, 400, { error: 'Unsupported connector action' })
  }

  if (!gatewayUrl || !gatewayToken) {
    return json(req, 500, { error: 'Connector gateway environment is not configured' })
  }

  if (!connectorId) {
    return json(req, 400, { error: 'connectorId is required' })
  }

  const response = await fetch(`${gatewayUrl}/connectors/whatsapp/start-pairing`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${gatewayToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ companyId, connectorId }),
  })

  const data = await response.json().catch(() => ({}))
  if (!response.ok) {
    await updateConnectorStatus(supabaseUrl, serviceRoleKey, connectorId, {
      status: 'error',
      last_error: data?.error ?? 'WhatsApp pairing failed',
    })
    return json(req, response.status, { error: data?.error ?? 'WhatsApp pairing failed' })
  }

  await updateConnectorStatus(supabaseUrl, serviceRoleKey, connectorId, {
    status: data.status ?? 'pairing',
    last_error: null,
  })

  return json(req, 200, {
    connectorId,
    status: data.status ?? 'pairing',
    qr: data.qr ?? null,
    message: data.message,
  })
})
