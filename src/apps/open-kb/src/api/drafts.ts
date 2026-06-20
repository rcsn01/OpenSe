import { db } from '../supabaseClient'
import { createIssue } from './issues'
import type { DraftIssue, DraftIssueInput, DraftIssueUpdateInput, Issue } from '../types'

const draftIssueSelect = `
  id,
  organisation_id,
  project_id,
  profile_id,
  title,
  description_json,
  description_html,
  description_text,
  status,
  payload,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier)
`

const toDraftPayload = (input: { payload?: DraftIssueInput['payload'] }) => ({
  priority: input.payload?.priority ?? 'none',
  state_id: input.payload?.state_id ?? null,
  estimate_point_id: input.payload?.estimate_point_id ?? null,
  start_date: input.payload?.start_date ?? null,
  target_date: input.payload?.target_date ?? null,
})

export const fetchDraftIssues = async ({
  organisationId,
  profileId,
}: {
  organisationId: string
  profileId: string
}): Promise<DraftIssue[]> => {
  const { data, error } = await db
    .from('draft_issues')
    .select(draftIssueSelect)
    .eq('organisation_id', organisationId)
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as unknown as DraftIssue[]
}

export const fetchDraftIssue = async ({
  organisationId,
  draftId,
}: {
  organisationId: string
  draftId: string
}): Promise<DraftIssue> => {
  const { data, error } = await db
    .from('draft_issues')
    .select(draftIssueSelect)
    .eq('organisation_id', organisationId)
    .eq('id', draftId)
    .is('deleted_at', null)
    .single()

  if (error) throw error

  return data as unknown as DraftIssue
}

export const createDraftIssue = async (input: DraftIssueInput): Promise<DraftIssue> => {
  const { data, error } = await db
    .from('draft_issues')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      profile_id: input.profile_id,
      title: input.title.trim(),
      description_json: input.description_json ?? undefined,
      description_html: input.description_html?.trim() || null,
      description_text: input.description_text?.trim() || null,
      status: 'draft',
      payload: toDraftPayload(input),
    })
    .select(draftIssueSelect)
    .single()

  if (error) throw error

  return data as unknown as DraftIssue
}

export const updateDraftIssue = async ({
  id,
  organisation_id,
  ...input
}: DraftIssueUpdateInput): Promise<DraftIssue> => {
  const { data, error } = await db
    .from('draft_issues')
    .update({
      project_id: input.project_id,
      title: input.title?.trim(),
      description_json: input.description_json ?? undefined,
      description_html: input.description_html?.trim() || input.description_html,
      description_text: input.description_text?.trim() || input.description_text,
      payload: toDraftPayload(input),
      status: 'draft',
    })
    .eq('organisation_id', organisation_id)
    .eq('id', id)
    .select(draftIssueSelect)
    .single()

  if (error) throw error

  return data as unknown as DraftIssue
}

export const deleteDraftIssue = async ({
  organisationId,
  draftId,
  status = 'deleted',
}: {
  organisationId: string
  draftId: string
  status?: 'deleted' | 'published'
}) => {
  const { error } = await db
    .from('draft_issues')
    .update({ deleted_at: new Date().toISOString(), status })
    .eq('organisation_id', organisationId)
    .eq('id', draftId)

  if (error) throw error
}

export const publishDraftIssue = async ({
  organisationId,
  draftId,
}: {
  organisationId: string
  draftId: string
}): Promise<Issue> => {
  const draft = await fetchDraftIssue({ organisationId, draftId })
  const issue = await createIssue({
    organisation_id: draft.organisation_id,
    project_id: draft.project_id,
    title: draft.title ?? 'Untitled draft',
    description_json: draft.description_json,
    description_html: draft.description_html,
    description_text: draft.description_text,
    priority: draft.payload.priority ?? 'none',
    state_id: draft.payload.state_id ?? null,
    estimate_point_id: draft.payload.estimate_point_id ?? null,
    start_date: draft.payload.start_date ?? null,
    target_date: draft.payload.target_date ?? null,
  })
  await deleteDraftIssue({ organisationId, draftId, status: 'published' })

  return issue
}
