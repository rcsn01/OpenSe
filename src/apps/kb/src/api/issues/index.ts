import { db, supabase } from '../../supabaseClient'
import type {
  Issue,
  IssueActivity,
  IssueAttachment,
  IssueAttachmentInput,
  IssueAssignee,
  CommentReaction,
  IssueComment,
  IssueCommentInput,
  IssueBlocker,
  IssueExternalLink,
  IssueFilters,
  IssueInput,
  IssueLabel,
  IssueLabelInput,
  IssueLabelLink,
  IssueMention,
  IssueReaction,
  IssueRelation,
  IssueRelationType,
  IssueLinkType,
  IssueState,
  IssueStateInput,
  IssueSubscriber,
  IssueUpdateInput,
  IssueVote,
  OpenKbProfile,
  OrganisationMemberProfile,
  SavedIssueView,
  SavedIssueViewInput,
} from '../../types'

const OPEN_KB_ASSETS_BUCKET = 'open-kb-assets'

const issueSelect = `
  id,
  organisation_id,
  project_id,
  sequence_id,
  title,
  description_json,
  description_html,
  description_text,
  priority,
  state_id,
  estimate_point_id,
  parent_issue_id,
  start_date,
  target_date,
  completed_at,
  archived_at,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier),
  state:states(id, organisation_id, project_id, name, group_key, color, sort_order, is_default)
`

const issueCommentSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  profile_id,
  actor_profile_id,
  description_json,
  description_html,
  description_text,
  created_by,
  created_at,
  updated_at
`

const issueAttachmentSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  name,
  title,
  description_text,
  status,
  metadata,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueActivitySelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  actor_profile_id,
  created_by,
  name,
  title,
  description_text,
  status,
  payload,
  created_at,
  updated_at,
  deleted_at
`

const issueBlockerSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  blocker_issue_id,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueRelationSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  related_issue_id,
  relation_type,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueLinkSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  title,
  url,
  link_type,
  description_text,
  status,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueSubscriberSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  profile_id,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueMentionSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  profile_id,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueVoteSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  profile_id,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueReactionSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  profile_id,
  name,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const commentReactionSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  comment_id,
  profile_id,
  name,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const issueLabelSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  label_id,
  label:labels(id, organisation_id, project_id, name, color, parent_id)
`

const issueViewSelect = `
  id,
  organisation_id,
  project_id,
  name,
  title,
  status,
  payload,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const sanitizeFileName = (name: string) =>
  name
    .trim()
    .replace(/[/\\?%*:|"<>]/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 140) || 'attachment'

const normalizeUrl = (value: string) => {
  const trimmed = value.trim()
  const withProtocol = /^https?:\/\//i.test(trimmed) ? trimmed : `https://${trimmed}`
  return new URL(withProtocol).toString()
}

const withSignedUrls = async (attachments: IssueAttachment[]): Promise<IssueAttachment[]> => {
  if (attachments.length === 0) return attachments

  const signed = await Promise.all(
    attachments.map(async (attachment) => {
      const storagePath = attachment.metadata?.storage_path
      if (!storagePath) return { ...attachment, signed_url: null }

      const { data, error } = await supabase.storage
        .from(OPEN_KB_ASSETS_BUCKET)
        .createSignedUrl(storagePath, 60 * 60)

      if (error) return { ...attachment, signed_url: null }
      return { ...attachment, signed_url: data.signedUrl }
    }),
  )

  return signed
}

const fetchIssuesByIds = async (
  organisationId: string,
  issueIds: Array<string | null | undefined>,
): Promise<Map<string, Issue>> => {
  const ids = Array.from(new Set(issueIds.filter((id): id is string => Boolean(id))))
  if (ids.length === 0) return new Map()

  const { data, error } = await db
    .from('issues')
    .select(issueSelect)
    .eq('organisation_id', organisationId)
    .in('id', ids)
    .is('deleted_at', null)

  if (error) throw error

  return new Map(((data ?? []) as unknown as Issue[]).map((issue) => [issue.id, issue]))
}

const fetchProfilesByIds = async (
  profileIds: Array<string | null | undefined>,
): Promise<Map<string, OpenKbProfile>> => {
  const ids = Array.from(new Set(profileIds.filter((id): id is string => Boolean(id))))
  if (ids.length === 0) return new Map()

  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, avatar_url')
    .in('id', ids)

  if (error) throw error

  return new Map((data ?? []).map((profile) => [profile.id, profile as OpenKbProfile]))
}

const logIssueActivity = async ({
  organisationId,
  projectId,
  issueId,
  event,
  title,
  description,
  entity,
  entityId,
  previous,
  current,
}: {
  organisationId: string
  projectId: string
  issueId: string
  event: string
  title: string
  description?: string | null
  entity?: string
  entityId?: string | null
  previous?: unknown
  current?: unknown
}) => {
  const { data, error } = await db
    .from('issue_activities')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      name: event,
      title,
      description_text: description ?? null,
      status: 'active',
      payload: {
        event,
        entity,
        entity_id: entityId ?? null,
        previous,
        current,
      },
    })
    .select(issueActivitySelect)
    .single()

  if (error) throw error

  const activity = data as unknown as IssueActivity
  const { data: auth } = await supabase.auth.getUser()
  const { data: subscribers } = await db
    .from('issue_subscribers')
    .select('profile_id')
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)

  const recipientIds = Array.from(
    new Set(
      ((subscribers ?? []) as Array<{ profile_id: string | null }>)
        .map((subscriber) => subscriber.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId && profileId !== auth.user?.id)),
    ),
  )

  if (recipientIds.length > 0) {
    const { data: preferences } = await db
      .from('user_notification_preferences')
      .select('profile_id, status, payload')
      .eq('organisation_id', organisationId)
      .in('profile_id', recipientIds)
      .is('deleted_at', null)

    const mutedRecipientIds = new Set(
      ((preferences ?? []) as Array<{
        profile_id: string | null
        status: string | null
        payload: { issue_notifications_enabled?: boolean } | null
      }>)
        .filter((preference) =>
          preference.status === 'muted' || preference.payload?.issue_notifications_enabled === false,
        )
        .map((preference) => preference.profile_id)
        .filter((profileId): profileId is string => Boolean(profileId)),
    )

    const enabledRecipientIds = recipientIds.filter((profileId) => !mutedRecipientIds.has(profileId))

    if (enabledRecipientIds.length === 0) return

    await db
      .from('notifications')
      .insert(enabledRecipientIds.map((profileId) => ({
        organisation_id: organisationId,
        project_id: projectId,
        issue_id: issueId,
        profile_id: profileId,
        actor_profile_id: auth.user?.id ?? null,
        name: event,
        title,
        description_text: description ?? null,
        status: 'unread',
        payload: {
          issue_id: issueId,
          project_id: projectId,
          activity_id: activity.id,
          event,
          entity,
          entity_id: entityId ?? null,
        },
      })))
  }
}

const safeLogIssueActivity = (input: Parameters<typeof logIssueActivity>[0]) => {
  void logIssueActivity(input).catch(() => {
    // Activity is an audit supplement; the primary mutation already succeeded.
  })
  return Promise.resolve()
}

const safeEnqueueCommentSyncs = (commentId: string) => {
  void (async () => {
    await Promise.allSettled([
      db.rpc('enqueue_github_comment_sync', { p_comment_id: commentId }),
      db.rpc('enqueue_slack_comment_sync', { p_comment_id: commentId }),
    ])
  })().catch(() => {
    // Provider sync is asynchronous; comment creation should not roll back if queueing fails.
  })
  return Promise.resolve()
}

const safeNotifyMentionedProfile = async ({
  organisationId,
  projectId,
  issueId,
  profileId,
  title,
  description,
}: {
  organisationId: string
  projectId: string
  issueId: string
  profileId: string
  title: string
  description?: string | null
}) => {
  try {
    const { data: auth } = await supabase.auth.getUser()
    if (profileId === auth.user?.id) return

    const { data: preference } = await db
      .from('user_notification_preferences')
      .select('status, payload')
      .eq('organisation_id', organisationId)
      .eq('profile_id', profileId)
      .is('deleted_at', null)
      .maybeSingle()

    const muted = preference?.status === 'muted'
      || (preference?.payload as { issue_notifications_enabled?: boolean } | null)?.issue_notifications_enabled === false
    if (muted) return

    await db
      .from('notifications')
      .insert({
        organisation_id: organisationId,
        project_id: projectId,
        issue_id: issueId,
        profile_id: profileId,
        actor_profile_id: auth.user?.id ?? null,
        name: 'mention.added',
        title,
        description_text: description ?? null,
        status: 'unread',
        payload: {
          issue_id: issueId,
          project_id: projectId,
          event: 'mention.added',
          entity: 'issue_mention',
        },
      })
  } catch {
    // Mention notifications should not roll back the mention mutation.
  }
}

export const fetchIssueStates = async (
  organisationId: string,
  projectId?: string | null,
): Promise<IssueState[]> => {
  let query = db
    .from('states')
    .select('id, organisation_id, project_id, name, group_key, color, sort_order, is_default')
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (projectId) {
    query = query.or(`project_id.eq.${projectId},project_id.is.null`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as IssueState[]
}

export const createIssueState = async (input: IssueStateInput): Promise<IssueState> => {
  const { data, error } = await db
    .from('states')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      name: input.name.trim(),
      group_key: input.group_key,
      color: input.color,
    })
    .select('id, organisation_id, project_id, name, group_key, color, sort_order, is_default')
    .single()

  if (error) throw error

  return data as IssueState
}

export const fetchIssueLabels = async (
  organisationId: string,
  projectId?: string | null,
): Promise<IssueLabel[]> => {
  let query = db
    .from('labels')
    .select('id, organisation_id, project_id, name, color, parent_id')
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (projectId) {
    query = query.or(`project_id.eq.${projectId},project_id.is.null`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as IssueLabel[]
}

export const createIssueLabel = async (input: IssueLabelInput): Promise<IssueLabel> => {
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id || null,
    name: input.name.trim(),
    color: input.color,
  }

  const { data, error } = await db
    .from('labels')
    .insert(payload)
    .select('id, organisation_id, project_id, name, color, parent_id')
    .single()

  if (error) throw error

  return data as IssueLabel
}

export const fetchOrganisationMemberProfiles = async (
  organisationId: string,
): Promise<OrganisationMemberProfile[]> => {
  type MemberRow = {
    user_id: string
    role: string
    profiles: OpenKbProfile | OpenKbProfile[] | null
  }

  const { data, error } = await supabase
    .from('organisation_members')
    .select('user_id, role, profiles(id, email, full_name, username, avatar_url), organisation_member_app_seats!inner(app_code)')
    .eq('org_id', organisationId)
    .eq('organisation_member_app_seats.app_code', 'open-kb')
    .order('role', { ascending: true })

  if (error) throw error

  return ((data ?? []) as MemberRow[])
    .map((row) => {
      const profile = normalizeSingle(row.profiles)
      return profile
        ? {
            profile_id: row.user_id,
            role: row.role,
            profile,
          }
        : null
    })
    .filter((row): row is OrganisationMemberProfile => Boolean(row))
}

const intersectIssueIds = (current: Set<string> | null, nextIds: string[]) => {
  const next = new Set(nextIds)
  if (!current) return next

  return new Set(Array.from(current).filter((id) => next.has(id)))
}

const fetchFilteredIssueIds = async ({
  organisationId,
  table,
  column,
  value,
}: {
  organisationId: string
  table: 'issue_assignees' | 'issue_labels' | 'cycle_issues' | 'module_issues'
  column: 'profile_id' | 'label_id' | 'cycle_id' | 'module_id'
  value: string
}) => {
  const { data, error } = await db
    .from(table)
    .select('issue_id')
    .eq('organisation_id', organisationId)
    .eq(column, value)
    .is('deleted_at', null)

  if (error) throw error

  return Array.from(new Set((data ?? []).map((row) => row.issue_id).filter((id): id is string => Boolean(id))))
}

export const fetchIssues = async ({
  organisationId,
  filters,
}: {
  organisationId: string
  filters?: IssueFilters
}): Promise<Issue[]> => {
  let filteredIssueIds: Set<string> | null = null
  const joinFilters = [
    filters?.assignee_id ? { table: 'issue_assignees' as const, column: 'profile_id' as const, value: filters.assignee_id } : null,
    filters?.label_id ? { table: 'issue_labels' as const, column: 'label_id' as const, value: filters.label_id } : null,
    filters?.cycle_id ? { table: 'cycle_issues' as const, column: 'cycle_id' as const, value: filters.cycle_id } : null,
    filters?.module_id ? { table: 'module_issues' as const, column: 'module_id' as const, value: filters.module_id } : null,
  ].filter((filter): filter is NonNullable<typeof filter> => Boolean(filter))

  for (const filter of joinFilters) {
    const issueIds = await fetchFilteredIssueIds({ organisationId, ...filter })
    filteredIssueIds = intersectIssueIds(filteredIssueIds, issueIds)
    if (filteredIssueIds.size === 0) return []
  }

  let query = db
    .from('issues')
    .select(issueSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (filteredIssueIds) {
    query = query.in('id', Array.from(filteredIssueIds))
  }

  if (filters?.project_id) {
    query = query.eq('project_id', filters.project_id)
  }

  if (filters?.state_id) {
    query = query.eq('state_id', filters.state_id)
  }

  if (filters?.priority) {
    query = query.eq('priority', filters.priority)
  }

  if (filters?.target === 'overdue') {
    query = query.lt('target_date', new Date().toISOString().slice(0, 10)).is('completed_at', null)
  } else if (filters?.target === 'due_soon') {
    const today = new Date()
    const soon = new Date(today)
    soon.setDate(today.getDate() + 7)
    query = query
      .gte('target_date', today.toISOString().slice(0, 10))
      .lte('target_date', soon.toISOString().slice(0, 10))
      .is('completed_at', null)
  } else if (filters?.target === 'no_target') {
    query = query.is('target_date', null)
  }

  if (filters?.query?.trim()) {
    const term = filters.query.trim().replace(/[%_,]/g, ' ')
    query = query.or(`title.ilike.%${term}%,description_text.ilike.%${term}%`)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as Issue[]
}

export const fetchIssueViews = async (organisationId: string): Promise<SavedIssueView[]> => {
  const { data, error } = await db
    .from('issue_views')
    .select(issueViewSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as unknown as SavedIssueView[]
}

export const createIssueView = async (input: SavedIssueViewInput): Promise<SavedIssueView> => {
  const payload = {
    filters: input.filters,
    view: input.view,
  }

  const { data, error } = await db
    .from('issue_views')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id || null,
      name: input.name.trim(),
      title: input.name.trim(),
      status: 'active',
      payload,
    })
    .select(issueViewSelect)
    .single()

  if (error) throw error

  return data as unknown as SavedIssueView
}

export const fetchIssue = async (organisationId: string, issueId: string): Promise<Issue> => {
  const { data, error } = await db
    .from('issues')
    .select(issueSelect)
    .eq('organisation_id', organisationId)
    .eq('id', issueId)
    .is('deleted_at', null)
    .single()

  if (error) throw error

  return data as unknown as Issue
}

export const createIssue = async (input: IssueInput): Promise<Issue> => {
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id,
    title: input.title.trim(),
    description_json: input.description_json ?? undefined,
    description_html: input.description_html?.trim() || null,
    description_text: input.description_text?.trim() || null,
    priority: input.priority,
    state_id: input.state_id || null,
    estimate_point_id: input.estimate_point_id || null,
    start_date: input.start_date || null,
    target_date: input.target_date || null,
  }

  const { data, error } = await db
    .from('issues')
    .insert(payload)
    .select(issueSelect)
    .single()

  if (error) throw error

  const issue = data as unknown as Issue
  await safeLogIssueActivity({
    organisationId: input.organisation_id,
    projectId: issue.project_id,
    issueId: issue.id,
    event: 'issue.created',
    title: 'Created issue',
    entity: 'issue',
    entityId: issue.id,
    current: {
      title: issue.title,
      priority: issue.priority,
      state_id: issue.state_id,
    },
  })

  return issue
}

export const updateIssue = async ({ id, organisation_id, ...input }: IssueUpdateInput): Promise<Issue> => {
  const previousIssue = await fetchIssue(organisation_id, id)
  const payload = {
    ...input,
    title: input.title?.trim(),
    description_html: input.description_html?.trim() || input.description_html,
    description_text: input.description_text?.trim() || input.description_text,
    state_id: input.state_id === undefined ? undefined : input.state_id || null,
    estimate_point_id: input.estimate_point_id === undefined ? undefined : input.estimate_point_id || null,
    updated_by: undefined,
  }

  const { data, error } = await db
    .from('issues')
    .update(payload)
    .eq('organisation_id', organisation_id)
    .eq('id', id)
    .select(issueSelect)
    .single()

  if (error) throw error

  const issue = data as unknown as Issue
  await safeLogIssueActivity({
    organisationId: organisation_id,
    projectId: issue.project_id,
    issueId: issue.id,
    event: 'issue.updated',
    title: 'Updated issue',
    entity: 'issue',
    entityId: issue.id,
    previous: {
      title: previousIssue.title,
      priority: previousIssue.priority,
      state_id: previousIssue.state_id,
      estimate_point_id: previousIssue.estimate_point_id,
      target_date: previousIssue.target_date,
    },
    current: {
      title: issue.title,
      priority: issue.priority,
      state_id: issue.state_id,
      estimate_point_id: issue.estimate_point_id,
      target_date: issue.target_date,
    },
  })

  return issue
}

export const fetchIssueComments = async (
  organisationId: string,
  issueId: string,
): Promise<IssueComment[]> => {
  const { data, error } = await db
    .from('issue_comments')
    .select(issueCommentSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []) as unknown as IssueComment[]
}

export const fetchIssueActivities = async (
  organisationId: string,
  issueId: string,
): Promise<IssueActivity[]> => {
  const { data, error } = await db
    .from('issue_activities')
    .select(issueActivitySelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data ?? []) as Array<Omit<IssueActivity, 'actor_profile'>>
  const profilesById = await fetchProfilesByIds(rows.map((row) => row.actor_profile_id ?? row.created_by))
  return rows.map((row) => ({
    ...row,
    actor_profile: profilesById.get(row.actor_profile_id ?? row.created_by ?? '') ?? null,
  }))
}

export const fetchIssueAttachments = async (
  organisationId: string,
  issueId: string,
): Promise<IssueAttachment[]> => {
  const { data, error } = await db
    .from('issue_attachments')
    .select(issueAttachmentSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return withSignedUrls((data ?? []) as unknown as IssueAttachment[])
}

export const fetchProjectIssueAttachments = async (
  organisationId: string,
  projectId: string,
): Promise<IssueAttachment[]> => {
  const { data, error } = await db
    .from('issue_attachments')
    .select(issueAttachmentSelect)
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return withSignedUrls((data ?? []) as unknown as IssueAttachment[])
}

export const uploadIssueAttachment = async ({
  organisation_id,
  project_id,
  issue_id,
  file,
}: IssueAttachmentInput): Promise<IssueAttachment> => {
  const fileName = sanitizeFileName(file.name)
  const storagePath = `${organisation_id}/${project_id}/issues/${issue_id}/${Date.now()}-${fileName}`

  const { error: uploadError } = await supabase.storage
    .from(OPEN_KB_ASSETS_BUCKET)
    .upload(storagePath, file, {
      cacheControl: '3600',
      contentType: file.type || undefined,
      upsert: false,
    })

  if (uploadError) throw uploadError

  const metadata = {
    storage_path: storagePath,
    bucket: OPEN_KB_ASSETS_BUCKET,
    file_name: file.name,
    mime_type: file.type || null,
    size: file.size,
  }

  const { data, error } = await db
    .from('issue_attachments')
    .insert({
      organisation_id,
      project_id,
      issue_id,
      name: file.name,
      title: file.name,
      description_text: file.type || null,
      status: 'active',
      metadata,
    })
    .select(issueAttachmentSelect)
    .single()

  if (error) {
    await supabase.storage.from(OPEN_KB_ASSETS_BUCKET).remove([storagePath])
    throw error
  }

  const [attachment] = await withSignedUrls([data as unknown as IssueAttachment])
  await safeLogIssueActivity({
    organisationId: organisation_id,
    projectId: project_id,
    issueId: issue_id,
    event: 'attachment.added',
    title: 'Added attachment',
    description: file.name,
    entity: 'issue_attachment',
    entityId: attachment.id,
    current: metadata,
  })
  return attachment
}

export const removeIssueAttachment = async ({
  organisationId,
  attachmentId,
  storagePath,
}: {
  organisationId: string
  attachmentId: string
  storagePath?: string | null
}) => {
  const { data: attachment } = await db
    .from('issue_attachments')
    .select(issueAttachmentSelect)
    .eq('organisation_id', organisationId)
    .eq('id', attachmentId)
    .maybeSingle()

  const { error } = await db
    .from('issue_attachments')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', attachmentId)

  if (error) throw error

  if (storagePath) {
    await supabase.storage.from(OPEN_KB_ASSETS_BUCKET).remove([storagePath])
  }

  if (attachment?.project_id && attachment.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: attachment.project_id,
      issueId: attachment.issue_id,
      event: 'attachment.removed',
      title: 'Removed attachment',
      description: attachment.name,
      entity: 'issue_attachment',
      entityId: attachmentId,
      previous: attachment.metadata,
    })
  }
}

export const fetchIssueBlockers = async (
  organisationId: string,
  issueId: string,
): Promise<IssueBlocker[]> => {
  const { data, error } = await db
    .from('issue_blockers')
    .select(issueBlockerSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as Array<Omit<IssueBlocker, 'blocker_issue'>>
  const issuesById = await fetchIssuesByIds(organisationId, rows.map((row) => row.blocker_issue_id))
  return rows.map((row) => ({
    ...row,
    blocker_issue: row.blocker_issue_id ? issuesById.get(row.blocker_issue_id) ?? null : null,
  }))
}

export const addIssueBlocker = async ({
  organisationId,
  projectId,
  issueId,
  blockerIssueId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  blockerIssueId: string
}): Promise<IssueBlocker> => {
  const { data, error } = await db
    .from('issue_blockers')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      blocker_issue_id: blockerIssueId,
      status: 'active',
    })
    .select(issueBlockerSelect)
    .single()

  if (error) throw error

  const issuesById = await fetchIssuesByIds(organisationId, [blockerIssueId])
  const row = data as unknown as Omit<IssueBlocker, 'blocker_issue'>
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'blocker.added',
    title: 'Added blocker',
    description: row.blocker_issue_id ? issuesById.get(row.blocker_issue_id)?.title : null,
    entity: 'issue_blocker',
    entityId: row.id,
    current: { blocker_issue_id: blockerIssueId },
  })
  return {
    ...row,
    blocker_issue: row.blocker_issue_id ? issuesById.get(row.blocker_issue_id) ?? null : null,
  }
}

export const removeIssueBlocker = async ({
  organisationId,
  blockerId,
}: {
  organisationId: string
  blockerId: string
}) => {
  const { data: blocker } = await db
    .from('issue_blockers')
    .select(issueBlockerSelect)
    .eq('organisation_id', organisationId)
    .eq('id', blockerId)
    .maybeSingle()

  const { error } = await db
    .from('issue_blockers')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', blockerId)

  if (error) throw error

  if (blocker?.project_id && blocker.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: blocker.project_id,
      issueId: blocker.issue_id,
      event: 'blocker.removed',
      title: 'Removed blocker',
      entity: 'issue_blocker',
      entityId: blockerId,
      previous: { blocker_issue_id: blocker.blocker_issue_id },
    })
  }
}

export const fetchIssueRelations = async (
  organisationId: string,
  issueId: string,
): Promise<IssueRelation[]> => {
  const { data, error } = await db
    .from('issue_relations')
    .select(issueRelationSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as unknown as Array<Omit<IssueRelation, 'related_issue'>>
  const issuesById = await fetchIssuesByIds(organisationId, rows.map((row) => row.related_issue_id))
  return rows.map((row) => ({
    ...row,
    related_issue: row.related_issue_id ? issuesById.get(row.related_issue_id) ?? null : null,
  }))
}

export const addIssueRelation = async ({
  organisationId,
  projectId,
  issueId,
  relatedIssueId,
  relationType,
}: {
  organisationId: string
  projectId: string
  issueId: string
  relatedIssueId: string
  relationType: IssueRelationType
}): Promise<IssueRelation> => {
  const { data, error } = await db
    .from('issue_relations')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      related_issue_id: relatedIssueId,
      relation_type: relationType,
      status: 'active',
    })
    .select(issueRelationSelect)
    .single()

  if (error) throw error

  const issuesById = await fetchIssuesByIds(organisationId, [relatedIssueId])
  const row = data as unknown as Omit<IssueRelation, 'related_issue'>
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'relation.added',
    title: 'Added related issue',
    description: row.related_issue_id ? issuesById.get(row.related_issue_id)?.title : null,
    entity: 'issue_relation',
    entityId: row.id,
    current: { related_issue_id: relatedIssueId, relation_type: relationType },
  })
  return {
    ...row,
    related_issue: row.related_issue_id ? issuesById.get(row.related_issue_id) ?? null : null,
  }
}

export const removeIssueRelation = async ({
  organisationId,
  relationId,
}: {
  organisationId: string
  relationId: string
}) => {
  const { data: relation } = await db
    .from('issue_relations')
    .select(issueRelationSelect)
    .eq('organisation_id', organisationId)
    .eq('id', relationId)
    .maybeSingle()

  const { error } = await db
    .from('issue_relations')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', relationId)

  if (error) throw error

  if (relation?.project_id && relation.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: relation.project_id,
      issueId: relation.issue_id,
      event: 'relation.removed',
      title: 'Removed related issue',
      entity: 'issue_relation',
      entityId: relationId,
      previous: {
        related_issue_id: relation.related_issue_id,
        relation_type: relation.relation_type,
      },
    })
  }
}

export const fetchIssueLinks = async (
  organisationId: string,
  issueId: string,
): Promise<IssueExternalLink[]> => {
  const { data, error } = await db
    .from('issue_links')
    .select(issueLinkSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as unknown as IssueExternalLink[]
}

export const addIssueLink = async ({
  organisationId,
  projectId,
  issueId,
  title,
  url,
  linkType,
}: {
  organisationId: string
  projectId: string
  issueId: string
  title?: string | null
  url: string
  linkType: IssueLinkType
}): Promise<IssueExternalLink> => {
  const normalizedUrl = normalizeUrl(url)
  const displayTitle = title?.trim() || new URL(normalizedUrl).hostname

  const { data, error } = await db
    .from('issue_links')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      title: displayTitle,
      url: normalizedUrl,
      link_type: linkType,
      description_text: normalizedUrl,
      status: 'active',
    })
    .select(issueLinkSelect)
    .single()

  if (error) throw error

  const link = data as unknown as IssueExternalLink
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'link.added',
    title: 'Added link',
    description: link.title ?? normalizedUrl,
    entity: 'issue_link',
    entityId: link.id,
    current: { url: normalizedUrl, link_type: linkType },
  })

  return link
}

export const removeIssueLink = async ({
  organisationId,
  linkId,
}: {
  organisationId: string
  linkId: string
}) => {
  const { data: link } = await db
    .from('issue_links')
    .select(issueLinkSelect)
    .eq('organisation_id', organisationId)
    .eq('id', linkId)
    .maybeSingle()

  const { error } = await db
    .from('issue_links')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', linkId)

  if (error) throw error

  if (link?.project_id && link.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: link.project_id,
      issueId: link.issue_id,
      event: 'link.removed',
      title: 'Removed link',
      description: link.title ?? link.url,
      entity: 'issue_link',
      entityId: linkId,
      previous: { url: link.url, link_type: link.link_type },
    })
  }
}

export const fetchIssueSubscribers = async (
  organisationId: string,
  issueId: string,
): Promise<IssueSubscriber[]> => {
  const { data, error } = await db
    .from('issue_subscribers')
    .select(issueSubscriberSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as Array<Omit<IssueSubscriber, 'profile'>>
  const profileIds = rows.map((row) => row.profile_id).filter((id): id is string => Boolean(id))
  if (profileIds.length === 0) {
    return rows.map((row) => ({ ...row, profile: null }))
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, avatar_url')
    .in('id', profileIds)

  if (profilesError) throw profilesError

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile as OpenKbProfile]))
  return rows.map((row) => ({
    ...row,
    profile: row.profile_id ? profileById.get(row.profile_id) ?? null : null,
  }))
}

export const subscribeToIssue = async ({
  organisationId,
  projectId,
  issueId,
  profileId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  profileId: string
}): Promise<IssueSubscriber> => {
  const { data, error } = await db
    .from('issue_subscribers')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      profile_id: profileId,
      status: 'active',
    })
    .select(issueSubscriberSelect)
    .single()

  if (error) throw error

  const subscriber = { ...(data as unknown as Omit<IssueSubscriber, 'profile'>), profile: null }
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'subscriber.added',
    title: 'Started watching issue',
    entity: 'issue_subscriber',
    entityId: subscriber.id,
    current: { profile_id: profileId },
  })

  return subscriber
}

export const unsubscribeFromIssue = async ({
  organisationId,
  subscriberId,
}: {
  organisationId: string
  subscriberId: string
}) => {
  const { data: subscriber } = await db
    .from('issue_subscribers')
    .select(issueSubscriberSelect)
    .eq('organisation_id', organisationId)
    .eq('id', subscriberId)
    .maybeSingle()

  const { error } = await db
    .from('issue_subscribers')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', subscriberId)

  if (error) throw error

  if (subscriber?.project_id && subscriber.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: subscriber.project_id,
      issueId: subscriber.issue_id,
      event: 'subscriber.removed',
      title: 'Stopped watching issue',
      entity: 'issue_subscriber',
      entityId: subscriberId,
      previous: { profile_id: subscriber.profile_id },
    })
  }
}

export const fetchIssueVotes = async (
  organisationId: string,
  issueId: string,
): Promise<IssueVote[]> => {
  const { data, error } = await db
    .from('issue_votes')
    .select(issueVoteSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []) as IssueVote[]
}

export const fetchIssueReactions = async (
  organisationId: string,
  issueId: string,
): Promise<IssueReaction[]> => {
  const { data, error } = await db
    .from('issue_reactions')
    .select(issueReactionSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []) as IssueReaction[]
}

export const fetchCommentReactions = async (
  organisationId: string,
  issueId: string,
): Promise<CommentReaction[]> => {
  const { data, error } = await db
    .from('comment_reactions')
    .select(commentReactionSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []) as CommentReaction[]
}

export const voteForIssue = async ({
  organisationId,
  projectId,
  issueId,
  profileId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  profileId: string
}): Promise<IssueVote> => {
  const { data, error } = await db
    .from('issue_votes')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      profile_id: profileId,
      status: 'active',
    })
    .select(issueVoteSelect)
    .single()

  if (error) throw error

  const vote = data as IssueVote
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'vote.added',
    title: 'Voted for issue',
    entity: 'issue_vote',
    entityId: vote.id,
    current: { profile_id: profileId },
  })

  return vote
}

export const removeIssueVote = async ({
  organisationId,
  voteId,
}: {
  organisationId: string
  voteId: string
}) => {
  const { data: vote } = await db
    .from('issue_votes')
    .select(issueVoteSelect)
    .eq('organisation_id', organisationId)
    .eq('id', voteId)
    .maybeSingle()

  const { error } = await db
    .from('issue_votes')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', voteId)

  if (error) throw error

  if (vote?.project_id && vote.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: vote.project_id,
      issueId: vote.issue_id,
      event: 'vote.removed',
      title: 'Removed vote',
      entity: 'issue_vote',
      entityId: voteId,
      previous: { profile_id: vote.profile_id },
    })
  }
}

export const addIssueReaction = async ({
  organisationId,
  projectId,
  issueId,
  profileId,
  name,
}: {
  organisationId: string
  projectId: string
  issueId: string
  profileId: string
  name: string
}): Promise<IssueReaction> => {
  const { data, error } = await db
    .from('issue_reactions')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      profile_id: profileId,
      name,
      status: 'active',
    })
    .select(issueReactionSelect)
    .single()

  if (error) throw error

  const reaction = data as IssueReaction
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'reaction.added',
    title: `Reacted ${name}`,
    entity: 'issue_reaction',
    entityId: reaction.id,
    current: { profile_id: profileId, name },
  })

  return reaction
}

export const removeIssueReaction = async ({
  organisationId,
  reactionId,
}: {
  organisationId: string
  reactionId: string
}) => {
  const { data: reaction } = await db
    .from('issue_reactions')
    .select(issueReactionSelect)
    .eq('organisation_id', organisationId)
    .eq('id', reactionId)
    .maybeSingle()

  const { error } = await db
    .from('issue_reactions')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', reactionId)

  if (error) throw error

  if (reaction?.project_id && reaction.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: reaction.project_id,
      issueId: reaction.issue_id,
      event: 'reaction.removed',
      title: `Removed reaction ${reaction.name ?? ''}`.trim(),
      entity: 'issue_reaction',
      entityId: reactionId,
      previous: { profile_id: reaction.profile_id, name: reaction.name },
    })
  }
}

export const addCommentReaction = async ({
  organisationId,
  projectId,
  issueId,
  commentId,
  profileId,
  name,
}: {
  organisationId: string
  projectId: string
  issueId: string
  commentId: string
  profileId: string
  name: string
}): Promise<CommentReaction> => {
  const { data, error } = await db
    .from('comment_reactions')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      comment_id: commentId,
      profile_id: profileId,
      name,
      status: 'active',
    })
    .select(commentReactionSelect)
    .single()

  if (error) throw error

  const reaction = data as CommentReaction
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'comment.reaction_added',
    title: `Reacted ${name} to comment`,
    entity: 'comment_reaction',
    entityId: reaction.id,
    current: { comment_id: commentId, profile_id: profileId, name },
  })

  return reaction
}

export const removeCommentReaction = async ({
  organisationId,
  reactionId,
}: {
  organisationId: string
  reactionId: string
}) => {
  const { data: reaction } = await db
    .from('comment_reactions')
    .select(commentReactionSelect)
    .eq('organisation_id', organisationId)
    .eq('id', reactionId)
    .maybeSingle()

  const { error } = await db
    .from('comment_reactions')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', reactionId)

  if (error) throw error

  if (reaction?.project_id && reaction.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: reaction.project_id,
      issueId: reaction.issue_id,
      event: 'comment.reaction_removed',
      title: `Removed comment reaction ${reaction.name ?? ''}`.trim(),
      entity: 'comment_reaction',
      entityId: reactionId,
      previous: { comment_id: reaction.comment_id, profile_id: reaction.profile_id, name: reaction.name },
    })
  }
}

export const createIssueComment = async (input: IssueCommentInput): Promise<IssueComment> => {
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id,
    issue_id: input.issue_id,
    description_json: input.description_json,
    description_html: input.description_html?.trim() || null,
    description_text: input.description_text?.trim() || null,
  }

  const { data, error } = await db
    .from('issue_comments')
    .insert(payload)
    .select(issueCommentSelect)
    .single()

  if (error) throw error

  const comment = data as unknown as IssueComment
  await safeEnqueueCommentSyncs(comment.id)
  await safeLogIssueActivity({
    organisationId: input.organisation_id,
    projectId: input.project_id,
    issueId: input.issue_id,
    event: 'comment.added',
    title: 'Added comment',
    description: input.description_text,
    entity: 'issue_comment',
    entityId: comment.id,
  })

  return comment
}

export const fetchIssueLabelLinks = async (
  organisationId: string,
  issueId: string,
): Promise<IssueLabelLink[]> => {
  const { data, error } = await db
    .from('issue_labels')
    .select(issueLabelSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  return (data ?? []).map((row) => {
    const item = row as unknown as IssueLabelLink & { label: IssueLabel | IssueLabel[] | null }
    return {
      ...item,
      label: normalizeSingle(item.label),
    }
  })
}

export const addIssueLabelLink = async ({
  organisationId,
  projectId,
  issueId,
  labelId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  labelId: string
}): Promise<IssueLabelLink> => {
  const { data, error } = await db
    .from('issue_labels')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      label_id: labelId,
    })
    .select(issueLabelSelect)
    .single()

  if (error) throw error

  const item = data as unknown as IssueLabelLink & { label: IssueLabel | IssueLabel[] | null }
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'label.added',
    title: 'Added label',
    description: normalizeSingle(item.label)?.name,
    entity: 'issue_label',
    entityId: item.id,
    current: { label_id: labelId },
  })

  return {
    ...item,
    label: normalizeSingle(item.label),
  }
}

export const removeIssueLabelLink = async ({
  organisationId,
  linkId,
}: {
  organisationId: string
  linkId: string
}) => {
  const { data: link } = await db
    .from('issue_labels')
    .select(issueLabelSelect)
    .eq('organisation_id', organisationId)
    .eq('id', linkId)
    .maybeSingle()

  const { error } = await db
    .from('issue_labels')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', linkId)

  if (error) throw error

  const item = link as unknown as (IssueLabelLink & { label: IssueLabel | IssueLabel[] | null }) | null
  if (item?.project_id && item.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: item.project_id,
      issueId: item.issue_id,
      event: 'label.removed',
      title: 'Removed label',
      description: normalizeSingle(item.label)?.name,
      entity: 'issue_label',
      entityId: linkId,
      previous: { label_id: item.label_id },
    })
  }
}

export const fetchIssueAssignees = async (
  organisationId: string,
  issueId: string,
): Promise<IssueAssignee[]> => {
  const { data, error } = await db
    .from('issue_assignees')
    .select('id, organisation_id, project_id, issue_id, profile_id')
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as Array<Omit<IssueAssignee, 'profile'>>
  const profileIds = rows.map((row) => row.profile_id).filter((id): id is string => Boolean(id))
  if (profileIds.length === 0) {
    return rows.map((row) => ({ ...row, profile: null }))
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, avatar_url')
    .in('id', profileIds)

  if (profilesError) throw profilesError

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile as OpenKbProfile]))
  return rows.map((row) => ({
    ...row,
    profile: row.profile_id ? profileById.get(row.profile_id) ?? null : null,
  }))
}

export const fetchProjectIssueAssignees = async (
  organisationId: string,
  projectId: string,
): Promise<IssueAssignee[]> => {
  const { data, error } = await db
    .from('issue_assignees')
    .select('id, organisation_id, project_id, issue_id, profile_id')
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as Array<Omit<IssueAssignee, 'profile'>>
  const profileIds = rows.map((row) => row.profile_id).filter((id): id is string => Boolean(id))
  if (profileIds.length === 0) {
    return rows.map((row) => ({ ...row, profile: null }))
  }

  const { data: profiles, error: profilesError } = await supabase
    .from('profiles')
    .select('id, email, full_name, username, avatar_url')
    .in('id', profileIds)

  if (profilesError) throw profilesError

  const profileById = new Map((profiles ?? []).map((profile) => [profile.id, profile as OpenKbProfile]))
  return rows.map((row) => ({
    ...row,
    profile: row.profile_id ? profileById.get(row.profile_id) ?? null : null,
  }))
}

export const addIssueAssignee = async ({
  organisationId,
  projectId,
  issueId,
  profileId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  profileId: string
}): Promise<IssueAssignee> => {
  const { data, error } = await db
    .from('issue_assignees')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      profile_id: profileId,
    })
    .select('id, organisation_id, project_id, issue_id, profile_id')
    .single()

  if (error) throw error

  const assignee = { ...(data as unknown as Omit<IssueAssignee, 'profile'>), profile: null }
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'assignee.added',
    title: 'Added assignee',
    entity: 'issue_assignee',
    entityId: assignee.id,
    current: { profile_id: profileId },
  })

  return assignee
}

export const removeIssueAssignee = async ({
  organisationId,
  assigneeId,
}: {
  organisationId: string
  assigneeId: string
}) => {
  const { data: assignee } = await db
    .from('issue_assignees')
    .select('id, organisation_id, project_id, issue_id, profile_id')
    .eq('organisation_id', organisationId)
    .eq('id', assigneeId)
    .maybeSingle()

  const { error } = await db
    .from('issue_assignees')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', assigneeId)

  if (error) throw error

  if (assignee?.project_id && assignee.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: assignee.project_id,
      issueId: assignee.issue_id,
      event: 'assignee.removed',
      title: 'Removed assignee',
      entity: 'issue_assignee',
      entityId: assigneeId,
      previous: { profile_id: assignee.profile_id },
    })
  }
}

export const fetchIssueMentions = async (
  organisationId: string,
  issueId: string,
): Promise<IssueMention[]> => {
  const { data, error } = await db
    .from('issue_mentions')
    .select(issueMentionSelect)
    .eq('organisation_id', organisationId)
    .eq('issue_id', issueId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (error) throw error

  const rows = (data ?? []) as Array<Omit<IssueMention, 'profile'>>
  const profilesById = await fetchProfilesByIds(rows.map((row) => row.profile_id))
  return rows.map((row) => ({
    ...row,
    profile: profilesById.get(row.profile_id ?? '') ?? null,
  }))
}

export const addIssueMention = async ({
  organisationId,
  projectId,
  issueId,
  profileId,
}: {
  organisationId: string
  projectId: string
  issueId: string
  profileId: string
}): Promise<IssueMention> => {
  const { data, error } = await db
    .from('issue_mentions')
    .insert({
      organisation_id: organisationId,
      project_id: projectId,
      issue_id: issueId,
      profile_id: profileId,
      status: 'active',
    })
    .select(issueMentionSelect)
    .single()

  if (error) throw error

  const mention = { ...(data as unknown as Omit<IssueMention, 'profile'>), profile: null }
  await safeLogIssueActivity({
    organisationId,
    projectId,
    issueId,
    event: 'mention.added',
    title: 'Mentioned teammate',
    entity: 'issue_mention',
    entityId: mention.id,
    current: { profile_id: profileId },
  })
  await safeNotifyMentionedProfile({
    organisationId,
    projectId,
    issueId,
    profileId,
    title: 'You were mentioned on an issue',
  })

  return mention
}

export const removeIssueMention = async ({
  organisationId,
  mentionId,
}: {
  organisationId: string
  mentionId: string
}) => {
  const { data: mention } = await db
    .from('issue_mentions')
    .select(issueMentionSelect)
    .eq('organisation_id', organisationId)
    .eq('id', mentionId)
    .maybeSingle()

  const { error } = await db
    .from('issue_mentions')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', mentionId)

  if (error) throw error

  if (mention?.project_id && mention.issue_id) {
    await safeLogIssueActivity({
      organisationId,
      projectId: mention.project_id,
      issueId: mention.issue_id,
      event: 'mention.removed',
      title: 'Removed mention',
      entity: 'issue_mention',
      entityId: mentionId,
      previous: { profile_id: mention.profile_id },
    })
  }
}
