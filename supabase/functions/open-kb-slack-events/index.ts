export {}

import { json, restFetch, verifyHmacSignature } from '../_shared/open-kb.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type SlackEventPayload = {
  type?: string
  challenge?: string
  event_id?: string
  team_id?: string
  event?: {
    type?: string
    channel?: string
    text?: string
    ts?: string
  }
}

type SlackProjectSyncRow = {
  id: string
  organisation_id: string
  project_id: string
  status: string | null
  external_id: string | null
  payload: Record<string, unknown>
}

type FeatureFlagRow = {
  slack_sync_enabled: boolean
}

const verifySlackSignature = async (rawBody: string, timestamp: string | null, signature: string | null, secret: string) => {
  if (!timestamp || !signature?.startsWith('v0=')) return false
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(timestamp))
  if (!Number.isFinite(ageSeconds) || ageSeconds > 60 * 5) return false

  return verifyHmacSignature({
    rawBody,
    signature,
    secret,
    expectedPrefix: 'v0=',
    signedPayload: `v0:${timestamp}:${rawBody}`,
  })
}

Deno.serve(async (req: Request) => {
  if (req.method !== 'POST') {
    return json(405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  const signingSecret = Deno.env.get('OPEN_KB_SLACK_SIGNING_SECRET')

  if (!supabaseUrl || !serviceRoleKey || !signingSecret) {
    return json(503, { error: 'Slack events endpoint is not configured' })
  }

  const rawBody = await req.text()
  const verified = await verifySlackSignature(
    rawBody,
    req.headers.get('x-slack-request-timestamp'),
    req.headers.get('x-slack-signature'),
    signingSecret,
  )
  if (!verified) {
    return json(401, { error: 'Invalid Slack signature' })
  }

  const payload = JSON.parse(rawBody) as SlackEventPayload
  if (payload.type === 'url_verification' && payload.challenge) {
    return json(200, { challenge: payload.challenge })
  }

  const channelId = payload.event?.channel
  if (!channelId) {
    return json(202, { received: true, matched: false })
  }

  const matches = await restFetch<SlackProjectSyncRow[]>(
    supabaseUrl,
    serviceRoleKey,
    `slack_project_syncs?channel_id=eq.${encodeURIComponent(channelId)}&sync_direction=eq.inbound&deleted_at=is.null&select=id,organisation_id,project_id,status,external_id,payload`,
  )

  const eventId = payload.event_id ?? payload.event?.ts ?? crypto.randomUUID()
  const updated = await Promise.all(matches.map(async (match) => {
    if (match.external_id === eventId) return false

    const flags = await restFetch<FeatureFlagRow[]>(
      supabaseUrl,
      serviceRoleKey,
      `feature_flags?organisation_id=eq.${encodeURIComponent(match.organisation_id)}&select=slack_sync_enabled`,
    )
    if (!flags[0]?.slack_sync_enabled) return false

    await restFetch(supabaseUrl, serviceRoleKey, `slack_project_syncs?id=eq.${encodeURIComponent(match.id)}`, {
      method: 'PATCH',
      headers: { Prefer: 'return=minimal' },
      body: JSON.stringify({
        status: 'received',
        external_id: eventId,
        payload: {
          ...(match.payload ?? {}),
          last_event: payload,
          last_event_at: new Date().toISOString(),
        },
      }),
    })
    return true
  }))

  return json(202, {
    received: true,
    matched: matches.length > 0,
    matches: matches.length,
    updated: updated.filter(Boolean).length,
  })
})
