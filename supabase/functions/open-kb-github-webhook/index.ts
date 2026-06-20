export {}

import { json, restFetch, verifyHmacSignature } from '../_shared/open-kb.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type GitHubWebhookPayload = {
  repository?: {
    id?: number
    full_name?: string
    owner?: { login?: string }
    name?: string
    html_url?: string
  }
  issue?: {
    number?: number
    html_url?: string
    title?: string
  }
  comment?: {
    id?: number
    html_url?: string
    body?: string
  }
  action?: string
}

type GitHubRepositoryRow = {
  id: string
  organisation_id: string
  project_id: string | null
}

type FeatureFlagRow = {
  github_sync_enabled: boolean
}

const verifyGitHubSignature = async (rawBody: string, signature: string | null, secret: string) => {
  return verifyHmacSignature({
    rawBody,
    signature,
    secret,
    expectedPrefix: 'sha256=',
  })
}

const isDuplicateKeyError = (error: unknown) =>
  error instanceof Error && (error.message.includes('23505') || error.message.toLowerCase().includes('duplicate key'))

const insertEvent = async (
  supabaseUrl: string,
  serviceRoleKey: string,
  path: string,
  body: Record<string, unknown>,
) => {
  try {
    await restFetch(supabaseUrl, serviceRoleKey, path, {
      method: 'POST',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify(body),
    })
    return true
  } catch (error) {
    if (isDuplicateKeyError(error)) return false
    throw error
  }
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const webhookSecret = Deno.env.get('OPEN_KB_GITHUB_WEBHOOK_SECRET')

  if (!supabaseUrl || !serviceRoleKey || !webhookSecret) {
    return json(503, { error: 'GitHub webhook endpoint is not configured' })
  }

  const rawBody = await req.text()
  const verified = await verifyGitHubSignature(rawBody, req.headers.get('x-hub-signature-256'), webhookSecret)
  if (!verified) {
    return json(401, { error: 'Invalid GitHub signature' })
  }

  const payload = JSON.parse(rawBody) as GitHubWebhookPayload
  const owner = payload.repository?.owner?.login
  const repo = payload.repository?.name
  if (!owner || !repo) {
    return json(202, { received: true, matched: false })
  }

  const repositories = await restFetch<GitHubRepositoryRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `github_repositories?repository_owner=eq.${encodeURIComponent(owner)}&repository_name=eq.${encodeURIComponent(repo)}&deleted_at=is.null&select=id,organisation_id,project_id`,
  )
  const repository = repositories[0]
  if (!repository) {
    return json(202, { received: true, matched: false })
  }

  const flags = await restFetch<FeatureFlagRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `feature_flags?organisation_id=eq.${encodeURIComponent(repository.organisation_id)}&select=github_sync_enabled`,
  )
  if (!flags[0]?.github_sync_enabled) {
    return json(202, { received: true, matched: true, disabled: true })
  }

  const eventName = req.headers.get('x-github-event') ?? 'unknown'
  const deliveryId = req.headers.get('x-github-delivery') ?? crypto.randomUUID()
  await insertEvent(supabaseUrl, serviceRoleKey, 'github_repository_syncs', {
    organisation_id: repository.organisation_id,
    project_id: repository.project_id,
    github_repository_id: repository.id,
    name: eventName,
    title: `${owner}/${repo} ${eventName}`,
    external_id: deliveryId,
    status: 'received',
    sync_type: eventName,
    payload,
  })

  if (payload.issue?.number) {
    await insertEvent(supabaseUrl, serviceRoleKey, 'github_issue_syncs', {
      organisation_id: repository.organisation_id,
      project_id: repository.project_id,
      github_repository_id: repository.id,
      name: eventName,
      title: payload.issue.title ?? `GitHub issue #${payload.issue.number}`,
      external_id: `${owner}/${repo}#${payload.issue.number}`,
      external_issue_number: payload.issue.number,
      external_issue_url: payload.issue.html_url ?? null,
      status: 'received',
      payload,
    })
  }

  if (payload.comment?.id) {
    await insertEvent(supabaseUrl, serviceRoleKey, 'github_comment_syncs', {
      organisation_id: repository.organisation_id,
      project_id: repository.project_id,
      github_repository_id: repository.id,
      name: eventName,
      title: `GitHub comment ${payload.comment.id}`,
      external_id: String(payload.comment.id),
      external_comment_id: String(payload.comment.id),
      external_comment_url: payload.comment.html_url ?? null,
      status: 'received',
      payload,
    })
  }

  return json(202, { received: true, matched: true })
})
