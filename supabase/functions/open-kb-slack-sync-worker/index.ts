export {}

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type SlackProjectSyncRow = {
  id: string
  organisation_id: string
  project_id: string
  issue_id: string | null
  comment_id: string | null
  organisation_integration_id: string | null
  channel_id: string | null
  channel_name: string | null
  external_id: string | null
  status: string | null
  sync_direction: string | null
  attempt_count: number | null
  next_retry_at: string | null
  payload: Record<string, unknown>
}

type SlackEventPayload = {
  event_id?: string
  team_id?: string
  event?: {
    type?: string
    channel?: string
    user?: string
    text?: string
    ts?: string
  }
}

type FeatureFlagRow = {
  slack_sync_enabled: boolean
}

type ProjectRow = {
  id: string
  identifier: string
}

type IssueRow = {
  id: string
  project_id: string
}

type IssueDetailRow = {
  id: string
  project_id: string
  sequence_id: number | null
  title: string | null
}

type ProjectIdentifierRow = {
  identifier: string | null
}

type IdRow = {
  id: string
}

type IssueCommentRow = {
  id: string
  description_text: string | null
  description_html: string | null
}

type IntegrationCredentialRow = {
  credential_ciphertext: string
}

type SlackPostMessageResponse = {
  ok?: boolean
  error?: string
  channel?: string
  ts?: string
  message?: { text?: string }
}

class RestError extends Error {
  status: number
  retryAfterSeconds: number | null

  constructor(message: string, status: number, retryAfterHeader: string | null) {
    super(message)
    this.name = 'RestError'
    this.status = status
    const parsed = retryAfterHeader ? Number(retryAfterHeader) : Number.NaN
    this.retryAfterSeconds = Number.isFinite(parsed) && parsed > 0 ? parsed : null
  }
}

const json = (status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  })

const encoder = new TextEncoder()
const decoder = new TextDecoder()

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const descriptionDoc = (text: string | null | undefined) => {
  const trimmed = text?.trim()
  return trimmed
    ? { type: 'doc', content: [{ type: 'paragraph', content: [{ type: 'text', text: trimmed }] }] }
    : { type: 'doc', content: [{ type: 'paragraph' }] }
}

const htmlFromText = (text: string | null | undefined) => {
  const trimmed = text?.trim()
  return trimmed ? `<p>${escapeHtml(trimmed).replace(/\n/g, '<br>')}</p>` : null
}

const isWorkerAuthorized = (req: Request, workerSecret: string) => {
  const bearer = req.headers.get('Authorization')?.replace(/^Bearer\s+/i, '')
  const explicit = req.headers.get('x-open-kb-worker-secret')
  return bearer === workerSecret || explicit === workerSecret
}

const isDuplicateKeyError = (error: unknown) =>
  error instanceof Error && (error.message.includes('23505') || error.message.toLowerCase().includes('duplicate key'))

const dueFilter = (statuses = ['received', 'waiting', 'retrying']) => {
  const now = encodeURIComponent(new Date().toISOString())
  return `status=in.(${statuses.join(',')})&or=(next_retry_at.is.null,next_retry_at.lte.${now})`
}

const retryDelaySeconds = (attempt: number, error?: unknown) => {
  if (error instanceof RestError && error.status === 429 && error.retryAfterSeconds) {
    return Math.min(error.retryAfterSeconds, 60 * 60)
  }

  return Math.min(60 * 2 ** Math.max(attempt - 1, 0), 60 * 30)
}

const errorText = (error: unknown) =>
  error instanceof Error ? error.message.slice(0, 1000) : String(error).slice(0, 1000)

const base64ToBytes = (value: string) =>
  Uint8Array.from(atob(value), (char) => char.charCodeAt(0))

const importCredentialKey = async (secret: string) => {
  const material = secret.startsWith('base64:')
    ? base64ToBytes(secret.slice('base64:'.length))
    : encoder.encode(secret)
  const keyBytes = material.length === 32
    ? material
    : new Uint8Array(await crypto.subtle.digest('SHA-256', material))
  return await crypto.subtle.importKey('raw', keyBytes, { name: 'AES-GCM' }, false, ['decrypt'])
}

const decryptCredential = async (ciphertext: string, secret: string) => {
  const [, ivBase64, encryptedBase64] = ciphertext.split('.')
  if (!ivBase64 || !encryptedBase64) throw new Error('Invalid integration credential ciphertext')
  const key = await importCredentialKey(secret)
  const plaintext = await crypto.subtle.decrypt(
    { name: 'AES-GCM', iv: base64ToBytes(ivBase64) },
    key,
    base64ToBytes(encryptedBase64),
  )
  return decoder.decode(plaintext)
}

const scheduleRetry = (
  row: Pick<SlackProjectSyncRow, 'attempt_count' | 'payload'>,
  reason: string,
  error: unknown,
  maxAttempts: number,
) => {
  const attemptCount = (row.attempt_count ?? 0) + 1
  const nextRetry = new Date(Date.now() + retryDelaySeconds(attemptCount, error) * 1000).toISOString()
  const failed = attemptCount >= maxAttempts
  return {
    status: failed ? 'failed' : 'retrying',
    attempt_count: attemptCount,
    next_retry_at: failed ? null : nextRetry,
    last_error_text: errorText(error),
    payload: {
      ...(row.payload ?? {}),
      worker_result: {
        reason,
        failed,
        attempt_count: attemptCount,
        next_retry_at: failed ? null : nextRetry,
        at: new Date().toISOString(),
      },
    },
  }
}

const waitForCondition = (
  row: Pick<SlackProjectSyncRow, 'payload'>,
  reason: string,
  seconds = 5 * 60,
) => ({
  status: 'waiting',
  next_retry_at: new Date(Date.now() + seconds * 1000).toISOString(),
  last_error_text: reason,
  payload: { ...(row.payload ?? {}), worker_result: { reason, at: new Date().toISOString() } },
})

const restFetch = async <T>(
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  init: RequestInit = {},
) => {
  const response = await fetch(`${supabaseUrl}/rest/v1/${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      apikey: serviceRoleKey,
      Authorization: `Bearer ${serviceRoleKey}`,
      'Accept-Profile': 'kb',
      'Content-Profile': 'kb',
      ...(init.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new RestError(
      data?.code ? `${data.code}: ${data.message}` : data?.message ?? data?.error ?? `Request failed: ${path}`,
      response.status,
      response.headers.get('retry-after'),
    )
  }
  return data as T
}

const patchSync = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  id: string,
  body: Record<string, unknown>,
) =>
  await restFetch(supabaseUrl, serviceRoleKey, `slack_project_syncs?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })

const featureEnabled = async (supabaseUrl: string, serviceRoleKey: string, organisationId: string) => {
  const rows = await restFetch<FeatureFlagRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `feature_flags?organisation_id=eq.${encodeURIComponent(organisationId)}&select=slack_sync_enabled`,
  )
  return Boolean(rows[0]?.slack_sync_enabled)
}

const slackFetch = async <T extends { ok?: boolean; error?: string }>(
  url: string,
  token: string,
  init: RequestInit = {},
) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json; charset=utf-8',
      ...(init.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => null) as T | null
  if (!response.ok || !data?.ok) {
    throw new RestError(
      data?.error ?? `Slack request failed: ${url}`,
      response.status,
      response.headers.get('retry-after'),
    )
  }
  return data
}

const getSlackToken = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  credentialKey: string,
  organisationIntegrationId: string,
) => {
  const credentials = await restFetch<IntegrationCredentialRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `integration_credentials?organisation_integration_id=eq.${encodeURIComponent(organisationIntegrationId)}&provider=eq.slack&revoked_at=is.null&select=credential_ciphertext&limit=1`,
  )
  const credential = credentials[0]
  if (!credential) throw new Error('slack_credential_not_found')
  return await decryptCredential(credential.credential_ciphertext, credentialKey)
}

const parseLastEvent = (payload: Record<string, unknown>) => {
  const lastEvent = payload.last_event
  if (!lastEvent || typeof lastEvent !== 'object') return null
  return lastEvent as SlackEventPayload
}

const findIssueKey = (text: string | null | undefined) => {
  const match = text?.match(/\b([A-Z][A-Z0-9]{1,9})-(\d{1,9})\b/)
  if (!match) return null
  return { identifier: match[1], sequenceId: Number(match[2]) }
}

const findIssue = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  organisationId: string,
  fallbackProjectId: string,
  text: string | null | undefined,
) => {
  const key = findIssueKey(text)
  if (!key) return null

  const projects = await restFetch<ProjectRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `projects?organisation_id=eq.${encodeURIComponent(organisationId)}&identifier=eq.${encodeURIComponent(key.identifier)}&deleted_at=is.null&select=id,identifier&limit=1`,
  )
  const projectId = projects[0]?.id ?? fallbackProjectId
  const issues = await restFetch<IssueRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `issues?organisation_id=eq.${encodeURIComponent(organisationId)}&project_id=eq.${encodeURIComponent(projectId)}&sequence_id=eq.${key.sequenceId}&deleted_at=is.null&select=id,project_id&limit=1`,
  )
  return issues[0] ?? null
}

const createOrFindComment = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  row: SlackProjectSyncRow,
  issue: IssueRow,
  event: SlackEventPayload,
) => {
  const eventId = row.external_id ?? event.event_id ?? event.event?.ts ?? row.id
  const externalId = `slack:${row.channel_id ?? event.event?.channel ?? 'channel'}:${eventId}`
  const existing = await restFetch<IdRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `issue_comments?organisation_id=eq.${encodeURIComponent(row.organisation_id)}&external_id=eq.${encodeURIComponent(externalId)}&deleted_at=is.null&select=id&limit=1`,
  )
  if (existing[0]) return existing[0].id

  const text = event.event?.text?.trim() || null
  try {
    const created = await restFetch<IdRow[]>(
      supabaseUrl,
      serviceRoleKey,
      'issue_comments?select=id',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          organisation_id: row.organisation_id,
          project_id: issue.project_id,
          issue_id: issue.id,
          external_id: externalId,
          description_json: descriptionDoc(text),
          description_html: htmlFromText(text),
          description_text: text,
          metadata: {
            source: 'slack',
            slack: {
              sync_id: row.id,
              channel_id: row.channel_id,
              channel_name: row.channel_name,
              event_id: eventId,
              event_ts: event.event?.ts ?? null,
              user: event.event?.user ?? null,
            },
          },
        }),
      },
    )
    return created[0]?.id ?? null
  } catch (error) {
    if (!isDuplicateKeyError(error)) throw error
    const duplicate = await restFetch<IdRow[]>(
      supabaseUrl,
      serviceRoleKey,
      `issue_comments?organisation_id=eq.${encodeURIComponent(row.organisation_id)}&external_id=eq.${encodeURIComponent(externalId)}&deleted_at=is.null&select=id&limit=1`,
    )
    return duplicate[0]?.id ?? null
  }
}

const processOutboundRows = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  credentialKey: string | null,
  limit: number,
  maxAttempts: number,
) => {
  const rows = await restFetch<SlackProjectSyncRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `slack_project_syncs?${dueFilter(['outbound_pending', 'retrying'])}&sync_direction=eq.outbound&deleted_at=is.null&select=id,organisation_id,project_id,issue_id,comment_id,organisation_integration_id,channel_id,channel_name,external_id,status,sync_direction,attempt_count,next_retry_at,payload&order=updated_at.asc&limit=${limit}`,
  )

  let processed = 0
  let ignored = 0
  let waiting = 0
  let retrying = 0
  let failed = 0

  for (const row of rows) {
    try {
      if (!credentialKey) throw new Error('slack_credential_key_not_configured')
      if (!row.organisation_integration_id || !row.channel_id || !row.issue_id || !row.comment_id) {
        await patchSync(supabaseUrl, serviceRoleKey, row.id, {
          status: 'ignored',
          processed_at: new Date().toISOString(),
          next_retry_at: null,
          last_error_text: 'missing_outbound_slack_mapping',
          payload: { ...row.payload, worker_result: { reason: 'missing_outbound_slack_mapping', at: new Date().toISOString() } },
        })
        ignored += 1
        continue
      }
      if (!await featureEnabled(supabaseUrl, serviceRoleKey, row.organisation_id)) {
        await patchSync(supabaseUrl, serviceRoleKey, row.id, waitForCondition(row, 'slack_sync_disabled'))
        waiting += 1
        continue
      }

      const comments = await restFetch<IssueCommentRow[]>(
        supabaseUrl,
        serviceRoleKey,
        `issue_comments?id=eq.${encodeURIComponent(row.comment_id)}&organisation_id=eq.${encodeURIComponent(row.organisation_id)}&deleted_at=is.null&select=id,description_text,description_html&limit=1`,
      )
      const comment = comments[0]
      if (!comment) {
        await patchSync(supabaseUrl, serviceRoleKey, row.id, waitForCondition(row, 'kb_comment_missing'))
        waiting += 1
        continue
      }

      const issues = await restFetch<IssueDetailRow[]>(
        supabaseUrl,
        serviceRoleKey,
        `issues?id=eq.${encodeURIComponent(row.issue_id)}&organisation_id=eq.${encodeURIComponent(row.organisation_id)}&deleted_at=is.null&select=id,project_id,sequence_id,title&limit=1`,
      )
      const issue = issues[0]
      if (!issue) {
        await patchSync(supabaseUrl, serviceRoleKey, row.id, waitForCondition(row, 'kb_issue_missing'))
        waiting += 1
        continue
      }

      const projects = await restFetch<ProjectIdentifierRow[]>(
        supabaseUrl,
        serviceRoleKey,
        `projects?id=eq.${encodeURIComponent(issue.project_id)}&organisation_id=eq.${encodeURIComponent(row.organisation_id)}&deleted_at=is.null&select=identifier&limit=1`,
      )
      const issueKey = projects[0]?.identifier && issue.sequence_id
        ? `${projects[0].identifier}-${issue.sequence_id}`
        : 'Open-KB issue'
      const commentText = comment.description_text?.trim() || comment.description_html?.trim() || '(empty comment)'
      const token = await getSlackToken(supabaseUrl, serviceRoleKey, credentialKey, row.organisation_integration_id)
      const posted = await slackFetch<SlackPostMessageResponse>('https://slack.com/api/chat.postMessage', token, {
        method: 'POST',
        body: JSON.stringify({
          channel: row.channel_id,
          text: `${issueKey}: ${commentText}`,
          unfurl_links: false,
          unfurl_media: false,
        }),
      })

      await patchSync(supabaseUrl, serviceRoleKey, row.id, {
        external_id: posted.ts ?? row.external_id,
        status: 'processed',
        next_retry_at: null,
        processed_at: new Date().toISOString(),
        last_error_text: null,
        payload: {
          ...row.payload,
          worker_result: {
            direction: 'outbound',
            issue_id: issue.id,
            issue_key: issueKey,
            slack_channel_id: posted.channel ?? row.channel_id,
            slack_message_ts: posted.ts ?? null,
            at: new Date().toISOString(),
          },
        },
      })
      processed += 1
    } catch (error) {
      const retryPatch = scheduleRetry(row, 'slack_message_outbound_failed', error, maxAttempts)
      await patchSync(supabaseUrl, serviceRoleKey, row.id, retryPatch)
      if (retryPatch.status === 'failed') failed += 1
      else retrying += 1
    }
  }

  return { processed, ignored, waiting, retrying, failed }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') return json(405, { error: 'Method not allowed' })

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const workerSecret = Deno.env.get('OPEN_KB_WORKER_SECRET')
  const credentialKey = Deno.env.get('OPEN_KB_INTEGRATION_CREDENTIAL_KEY') ?? null
  if (!supabaseUrl || !serviceRoleKey || !workerSecret) {
    return json(503, { error: 'Slack sync worker is not configured' })
  }
  if (!isWorkerAuthorized(req, workerSecret)) return json(401, { error: 'Unauthorized' })

  const body = await req.json().catch(() => ({})) as { limit?: number; max_attempts?: number }
  const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100)
  const configuredMaxAttempts = Number(Deno.env.get('OPEN_KB_WORKER_MAX_ATTEMPTS') ?? body.max_attempts ?? 5)
  const maxAttempts = Math.min(Math.max(Number.isFinite(configuredMaxAttempts) ? configuredMaxAttempts : 5, 1), 20)
  const rows = await restFetch<SlackProjectSyncRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `slack_project_syncs?${dueFilter()}&sync_direction=eq.inbound&deleted_at=is.null&select=id,organisation_id,project_id,issue_id,comment_id,organisation_integration_id,channel_id,channel_name,external_id,status,sync_direction,attempt_count,next_retry_at,payload&order=updated_at.asc&limit=${limit}`,
  )

  let processed = 0
  let ignored = 0
  let waiting = 0
  let retrying = 0
  let failed = 0

  for (const row of rows) {
    try {
      const event = parseLastEvent(row.payload)
      if (!event?.event || event.event.type !== 'message') {
        await patchSync(supabaseUrl, serviceRoleKey, row.id, {
          status: 'ignored',
          processed_at: new Date().toISOString(),
          next_retry_at: null,
          last_error_text: 'unsupported_event',
          payload: { ...row.payload, worker_result: { reason: 'unsupported_event', at: new Date().toISOString() } },
        })
        ignored += 1
        continue
      }

      if (!await featureEnabled(supabaseUrl, serviceRoleKey, row.organisation_id)) {
        await patchSync(supabaseUrl, serviceRoleKey, row.id, waitForCondition(row, 'slack_sync_disabled'))
        waiting += 1
        continue
      }

      const issue = await findIssue(supabaseUrl, serviceRoleKey, row.organisation_id, row.project_id, event.event.text)
      if (!issue) {
        await patchSync(supabaseUrl, serviceRoleKey, row.id, {
          status: 'ignored',
          processed_at: new Date().toISOString(),
          next_retry_at: null,
          last_error_text: 'missing_issue_key',
          payload: { ...row.payload, worker_result: { reason: 'missing_issue_key', at: new Date().toISOString() } },
        })
        ignored += 1
        continue
      }

      const commentId = await createOrFindComment(supabaseUrl, serviceRoleKey, row, issue, event)
      await patchSync(supabaseUrl, serviceRoleKey, row.id, {
        status: 'processed',
        next_retry_at: null,
        processed_at: new Date().toISOString(),
        last_error_text: null,
        payload: { ...row.payload, worker_result: { issue_id: issue.id, comment_id: commentId, at: new Date().toISOString() } },
      })
      processed += 1
    } catch (error) {
      const retryPatch = scheduleRetry(row, 'slack_event_processing_failed', error, maxAttempts)
      await patchSync(supabaseUrl, serviceRoleKey, row.id, retryPatch)
      if (retryPatch.status === 'failed') failed += 1
      else retrying += 1
    }
  }

  const outboundMessages = await processOutboundRows(supabaseUrl, serviceRoleKey, credentialKey, limit, maxAttempts)

  return json(200, {
    inbound_events: { processed, ignored, waiting, retrying, failed },
    outbound_messages: outboundMessages,
    max_attempts: maxAttempts,
  })
})
