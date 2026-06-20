export {}

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type GitHubIssuePayload = {
  action?: string
  issue?: {
    number?: number
    html_url?: string
    title?: string
    body?: string | null
  }
}

type GitHubCommentPayload = GitHubIssuePayload & {
  comment?: {
    id?: number
    html_url?: string
    body?: string | null
  }
}

type SyncRow = {
  id: string
  organisation_id: string
  project_id: string | null
  github_repository_id: string | null
  issue_id: string | null
  external_id: string | null
  status: string | null
  title: string | null
  attempt_count: number | null
  next_retry_at: string | null
  payload: Record<string, unknown>
}

type IssueSyncRow = SyncRow & {
  external_issue_number: number | null
  external_issue_url: string | null
}

type CommentSyncRow = SyncRow & {
  comment_id: string | null
  external_comment_id: string | null
  external_comment_url: string | null
  sync_direction: string | null
}

type FeatureFlagRow = {
  github_sync_enabled: boolean
}

type ProjectRow = {
  id: string
  identifier: string
}

type StateRow = {
  id: string
}

type IdRow = {
  id: string
}

type IssueIdRow = {
  issue_id: string | null
}

type IssueNumberRow = {
  external_issue_number: number | null
}

type GitHubRepositoryRow = {
  id: string
  organisation_integration_id: string | null
  repository_owner: string | null
  repository_name: string | null
}

type IntegrationCredentialRow = {
  credential_ciphertext: string
}

type IssueCommentRow = {
  id: string
  description_text: string | null
  description_html: string | null
}

type GitHubCreatedComment = {
  id?: number
  html_url?: string
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

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')

const encoder = new TextEncoder()
const decoder = new TextDecoder()

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

const retryAfterHeader = (headers: Headers) => {
  const retryAfter = headers.get('retry-after')
  if (retryAfter) return retryAfter
  const reset = Number(headers.get('x-ratelimit-reset'))
  if (!Number.isFinite(reset) || reset <= 0) return null
  return String(Math.max(Math.ceil(reset - Date.now() / 1000), 1))
}

const scheduleRetry = (
  row: Pick<SyncRow, 'attempt_count' | 'payload'>,
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
  row: Pick<SyncRow, 'payload'>,
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
      'Accept-Profile': 'open_kb',
      'Content-Profile': 'open_kb',
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

const patchRow = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  table: string,
  id: string,
  body: Record<string, unknown>,
) =>
  await restFetch(supabaseUrl, serviceRoleKey, `${table}?id=eq.${encodeURIComponent(id)}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=minimal' },
    body: JSON.stringify(body),
  })

const featureEnabled = async (supabaseUrl: string, serviceRoleKey: string, organisationId: string) => {
  const rows = await restFetch<FeatureFlagRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `feature_flags?organisation_id=eq.${encodeURIComponent(organisationId)}&select=github_sync_enabled`,
  )
  return Boolean(rows[0]?.github_sync_enabled)
}

const githubFetch = async <T>(url: string, token: string, init: RequestInit = {}) => {
  const response = await fetch(url, {
    ...init,
    headers: {
      Accept: 'application/vnd.github+json',
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      'X-GitHub-Api-Version': '2022-11-28',
      ...(init.headers ?? {}),
    },
  })
  const data = await response.json().catch(() => null)
  if (!response.ok) {
    throw new RestError(
      data?.message ?? `GitHub request failed: ${url}`,
      response.status,
      retryAfterHeader(response.headers),
    )
  }
  return data as T
}

const getDefaultStateId = async (supabaseUrl: string, serviceRoleKey: string, projectId: string) => {
  const states = await restFetch<StateRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `states?project_id=eq.${encodeURIComponent(projectId)}&is_default=eq.true&deleted_at=is.null&select=id&limit=1`,
  )
  return states[0]?.id ?? null
}

const createOrFindIssue = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  row: IssueSyncRow,
) => {
  const payload = row.payload as GitHubIssuePayload
  const issueNumber = row.external_issue_number ?? payload.issue?.number
  const externalId = `github:${row.github_repository_id ?? 'repository'}:${issueNumber ?? row.external_id ?? row.id}`
  const existing = await restFetch<IdRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `issues?organisation_id=eq.${encodeURIComponent(row.organisation_id)}&external_id=eq.${encodeURIComponent(externalId)}&deleted_at=is.null&select=id&limit=1`,
  )
  if (existing[0]) return existing[0].id

  const stateId = row.project_id ? await getDefaultStateId(supabaseUrl, serviceRoleKey, row.project_id) : null
  const bodyText = payload.issue?.body?.trim() || row.external_issue_url || payload.issue?.html_url || null
  const title = payload.issue?.title?.trim() || row.title?.trim() || (issueNumber ? `GitHub issue #${issueNumber}` : 'GitHub issue')

  try {
    const created = await restFetch<IdRow[]>(
      supabaseUrl,
      serviceRoleKey,
      'issues?select=id',
      {
        method: 'POST',
        headers: { Prefer: 'return=representation' },
        body: JSON.stringify({
          organisation_id: row.organisation_id,
          project_id: row.project_id,
          title,
          description_json: descriptionDoc(bodyText),
          description_html: htmlFromText(bodyText),
          description_text: bodyText,
          state_id: stateId,
          external_id: externalId,
          metadata: {
            source: 'github',
            github: {
              sync_id: row.id,
              repository_id: row.github_repository_id,
              external_id: row.external_id,
              issue_number: issueNumber,
              issue_url: row.external_issue_url ?? payload.issue?.html_url ?? null,
              action: payload.action ?? null,
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
      `issues?organisation_id=eq.${encodeURIComponent(row.organisation_id)}&external_id=eq.${encodeURIComponent(externalId)}&deleted_at=is.null&select=id&limit=1`,
    )
    return duplicate[0]?.id ?? null
  }
}

const findGitHubIssueId = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  row: CommentSyncRow,
) => {
  if (row.issue_id) return row.issue_id
  const payload = row.payload as GitHubCommentPayload
  const issueNumber = payload.issue?.number
  if (!issueNumber || !row.github_repository_id) return null

  const issueSyncs = await restFetch<IssueIdRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `github_issue_syncs?organisation_id=eq.${encodeURIComponent(row.organisation_id)}&github_repository_id=eq.${encodeURIComponent(row.github_repository_id)}&external_issue_number=eq.${issueNumber}&issue_id=not.is.null&deleted_at=is.null&select=issue_id&limit=1`,
  )
  return issueSyncs[0]?.issue_id ?? null
}

const findGitHubIssueNumber = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  row: CommentSyncRow,
) => {
  const payload = row.payload as GitHubCommentPayload
  if (payload.issue?.number) return payload.issue.number
  if (!row.issue_id || !row.github_repository_id) return null

  const issueSyncs = await restFetch<IssueNumberRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `github_issue_syncs?organisation_id=eq.${encodeURIComponent(row.organisation_id)}&github_repository_id=eq.${encodeURIComponent(row.github_repository_id)}&issue_id=eq.${encodeURIComponent(row.issue_id)}&external_issue_number=not.is.null&deleted_at=is.null&select=external_issue_number&limit=1`,
  )
  return issueSyncs[0]?.external_issue_number ?? null
}

const getRepositoryAndToken = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  credentialKey: string,
  repositoryId: string,
) => {
  const repositories = await restFetch<GitHubRepositoryRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `github_repositories?id=eq.${encodeURIComponent(repositoryId)}&deleted_at=is.null&select=id,organisation_integration_id,repository_owner,repository_name&limit=1`,
  )
  const repository = repositories[0]
  if (!repository?.organisation_integration_id || !repository.repository_owner || !repository.repository_name) {
    throw new Error('github_repository_mapping_incomplete')
  }

  const credentials = await restFetch<IntegrationCredentialRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `integration_credentials?organisation_integration_id=eq.${encodeURIComponent(repository.organisation_integration_id)}&provider=eq.github&revoked_at=is.null&select=credential_ciphertext&limit=1`,
  )
  const credential = credentials[0]
  if (!credential) throw new Error('github_credential_not_found')

  return {
    repository,
    token: await decryptCredential(credential.credential_ciphertext, credentialKey),
  }
}

const createOrFindComment = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  row: CommentSyncRow,
  issueId: string,
) => {
  const payload = row.payload as GitHubCommentPayload
  const externalCommentId = row.external_comment_id ?? (payload.comment?.id ? String(payload.comment.id) : row.external_id ?? row.id)
  const externalId = `github-comment:${row.github_repository_id ?? 'repository'}:${externalCommentId}`
  const existing = await restFetch<IdRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `issue_comments?organisation_id=eq.${encodeURIComponent(row.organisation_id)}&external_id=eq.${encodeURIComponent(externalId)}&deleted_at=is.null&select=id&limit=1`,
  )
  if (existing[0]) return existing[0].id

  const bodyText = payload.comment?.body?.trim() || row.external_comment_url || payload.comment?.html_url || null
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
          project_id: row.project_id,
          issue_id: issueId,
          external_id: externalId,
          description_json: descriptionDoc(bodyText),
          description_html: htmlFromText(bodyText),
          description_text: bodyText,
          metadata: {
            source: 'github',
            github: {
              sync_id: row.id,
              repository_id: row.github_repository_id,
              external_comment_id: externalCommentId,
              comment_url: row.external_comment_url ?? payload.comment?.html_url ?? null,
              issue_number: payload.issue?.number ?? null,
              action: payload.action ?? null,
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

const processIssueRows = async (supabaseUrl: string, serviceRoleKey: string, limit: number, maxAttempts: number) => {
  const rows = await restFetch<IssueSyncRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `github_issue_syncs?${dueFilter()}&deleted_at=is.null&select=id,organisation_id,project_id,github_repository_id,issue_id,external_id,status,title,attempt_count,next_retry_at,payload,external_issue_number,external_issue_url&order=created_at.asc&limit=${limit}`,
  )
  let processed = 0
  let ignored = 0
  let waiting = 0
  let failed = 0
  let retrying = 0

  for (const row of rows) {
    const payload = row.payload ?? {}
    try {
      if (!row.project_id) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_issue_syncs', row.id, {
          status: 'ignored',
          processed_at: new Date().toISOString(),
          next_retry_at: null,
          last_error_text: 'missing_project_mapping',
          payload: { ...payload, worker_result: { reason: 'missing_project_mapping', at: new Date().toISOString() } },
        })
        ignored += 1
        continue
      }
      if (!await featureEnabled(supabaseUrl, serviceRoleKey, row.organisation_id)) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_issue_syncs', row.id, waitForCondition(row, 'github_sync_disabled'))
        waiting += 1
        continue
      }

      const issueId = row.issue_id ?? await createOrFindIssue(supabaseUrl, serviceRoleKey, row)
      if (!issueId) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_issue_syncs', row.id, waitForCondition(row, 'issue_not_created'))
        waiting += 1
        continue
      }

      await patchRow(supabaseUrl, serviceRoleKey, 'github_issue_syncs', row.id, {
        issue_id: issueId,
        status: 'processed',
        next_retry_at: null,
        processed_at: new Date().toISOString(),
        last_error_text: null,
        payload: { ...payload, worker_result: { issue_id: issueId, at: new Date().toISOString() } },
      })
      processed += 1
    } catch (error) {
      const retryPatch = scheduleRetry(row, 'github_issue_processing_failed', error, maxAttempts)
      await patchRow(supabaseUrl, serviceRoleKey, 'github_issue_syncs', row.id, retryPatch)
      if (retryPatch.status === 'failed') failed += 1
      else retrying += 1
    }
  }

  return { processed, ignored, waiting, retrying, failed }
}

const processCommentRows = async (supabaseUrl: string, serviceRoleKey: string, limit: number, maxAttempts: number) => {
  const rows = await restFetch<CommentSyncRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `github_comment_syncs?${dueFilter()}&sync_direction=eq.inbound&deleted_at=is.null&select=id,organisation_id,project_id,github_repository_id,issue_id,comment_id,external_id,status,title,attempt_count,next_retry_at,payload,external_comment_id,external_comment_url,sync_direction&order=created_at.asc&limit=${limit}`,
  )
  let processed = 0
  let ignored = 0
  let waiting = 0
  let failed = 0
  let retrying = 0

  for (const row of rows) {
    const payload = row.payload ?? {}
    try {
      if (!row.project_id) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, {
          status: 'ignored',
          processed_at: new Date().toISOString(),
          next_retry_at: null,
          last_error_text: 'missing_project_mapping',
          payload: { ...payload, worker_result: { reason: 'missing_project_mapping', at: new Date().toISOString() } },
        })
        ignored += 1
        continue
      }
      if (!await featureEnabled(supabaseUrl, serviceRoleKey, row.organisation_id)) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, waitForCondition(row, 'github_sync_disabled'))
        waiting += 1
        continue
      }

      const issueId = await findGitHubIssueId(supabaseUrl, serviceRoleKey, row)
      if (!issueId) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, waitForCondition(row, 'issue_not_processed'))
        waiting += 1
        continue
      }

      const commentId = row.comment_id ?? await createOrFindComment(supabaseUrl, serviceRoleKey, row, issueId)
      await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, {
        issue_id: issueId,
        comment_id: commentId,
        status: 'processed',
        next_retry_at: null,
        processed_at: new Date().toISOString(),
        last_error_text: null,
        payload: { ...payload, worker_result: { issue_id: issueId, comment_id: commentId, at: new Date().toISOString() } },
      })
      processed += 1
    } catch (error) {
      const retryPatch = scheduleRetry(row, 'github_comment_processing_failed', error, maxAttempts)
      await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, retryPatch)
      if (retryPatch.status === 'failed') failed += 1
      else retrying += 1
    }
  }

  return { processed, ignored, waiting, retrying, failed }
}

const processOutboundCommentRows = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  credentialKey: string | null,
  limit: number,
  maxAttempts: number,
) => {
  const rows = await restFetch<CommentSyncRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `github_comment_syncs?${dueFilter(['outbound_pending', 'retrying'])}&sync_direction=eq.outbound&deleted_at=is.null&select=id,organisation_id,project_id,github_repository_id,issue_id,comment_id,external_id,status,title,attempt_count,next_retry_at,payload,external_comment_id,external_comment_url,sync_direction&order=created_at.asc&limit=${limit}`,
  )
  let processed = 0
  let ignored = 0
  let waiting = 0
  let failed = 0
  let retrying = 0

  for (const row of rows) {
    const payload = row.payload ?? {}
    try {
      if (!credentialKey) throw new Error('github_credential_key_not_configured')
      if (!row.github_repository_id || !row.issue_id || !row.comment_id) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, {
          status: 'ignored',
          processed_at: new Date().toISOString(),
          next_retry_at: null,
          last_error_text: 'missing_outbound_comment_mapping',
          payload: { ...payload, worker_result: { reason: 'missing_outbound_comment_mapping', at: new Date().toISOString() } },
        })
        ignored += 1
        continue
      }
      if (!await featureEnabled(supabaseUrl, serviceRoleKey, row.organisation_id)) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, waitForCondition(row, 'github_sync_disabled'))
        waiting += 1
        continue
      }

      const issueNumber = await findGitHubIssueNumber(supabaseUrl, serviceRoleKey, row)
      if (!issueNumber) {
        await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, waitForCondition(row, 'github_issue_number_missing'))
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
        await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, waitForCondition(row, 'open_kb_comment_missing'))
        waiting += 1
        continue
      }

      const { repository, token } = await getRepositoryAndToken(supabaseUrl, serviceRoleKey, credentialKey, row.github_repository_id)
      const body = comment.description_text?.trim() || comment.description_html?.trim() || row.title?.trim() || '(empty comment)'
      const created = await githubFetch<GitHubCreatedComment>(
        `https://api.github.com/repos/${encodeURIComponent(repository.repository_owner ?? '')}/${encodeURIComponent(repository.repository_name ?? '')}/issues/${issueNumber}/comments`,
        token,
        {
          method: 'POST',
          body: JSON.stringify({ body }),
        },
      )
      const externalCommentId = created.id ? String(created.id) : row.external_comment_id

      await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, {
        external_comment_id: externalCommentId,
        external_comment_url: created.html_url ?? row.external_comment_url,
        external_id: row.external_id ?? (externalCommentId ? `github-comment:${row.github_repository_id}:${externalCommentId}` : null),
        status: 'processed',
        next_retry_at: null,
        processed_at: new Date().toISOString(),
        last_error_text: null,
        payload: {
          ...payload,
          worker_result: {
            direction: 'outbound',
            issue_number: issueNumber,
            github_comment_id: externalCommentId,
            github_comment_url: created.html_url ?? null,
            at: new Date().toISOString(),
          },
        },
      })
      processed += 1
    } catch (error) {
      const retryPatch = scheduleRetry(row, 'github_comment_outbound_failed', error, maxAttempts)
      await patchRow(supabaseUrl, serviceRoleKey, 'github_comment_syncs', row.id, retryPatch)
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
    return json(503, { error: 'GitHub sync worker is not configured' })
  }
  if (!isWorkerAuthorized(req, workerSecret)) return json(401, { error: 'Unauthorized' })

  const body = await req.json().catch(() => ({})) as { limit?: number; max_attempts?: number }
  const limit = Math.min(Math.max(Number(body.limit ?? 25), 1), 100)
  const configuredMaxAttempts = Number(Deno.env.get('OPEN_KB_WORKER_MAX_ATTEMPTS') ?? body.max_attempts ?? 5)
  const maxAttempts = Math.min(Math.max(Number.isFinite(configuredMaxAttempts) ? configuredMaxAttempts : 5, 1), 20)
  const projects = await restFetch<ProjectRow[]>(supabaseUrl, serviceRoleKey, 'projects?select=id,identifier&limit=1')
  if (!Array.isArray(projects)) return json(500, { error: 'Open-KB REST API unavailable' })

  const issues = await processIssueRows(supabaseUrl, serviceRoleKey, limit, maxAttempts)
  const comments = await processCommentRows(supabaseUrl, serviceRoleKey, limit, maxAttempts)
  const outboundComments = await processOutboundCommentRows(supabaseUrl, serviceRoleKey, credentialKey, limit, maxAttempts)
  return json(200, { issues, comments, outbound_comments: outboundComments, max_attempts: maxAttempts })
})
