import { db } from '../supabaseClient'
import type { OpenKbSticky, OpenKbStickyInput, OpenKbStickyUpdateInput } from '../types'

const stickySelect = `
  id,
  organisation_id,
  project_id,
  profile_id,
  title,
  description_json,
  description_html,
  description_text,
  status,
  metadata,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier)
`

export const fetchStickies = async ({
  organisationId,
  profileId,
  projectId,
}: {
  organisationId: string
  profileId: string
  projectId?: string | null
}): Promise<OpenKbSticky[]> => {
  let query = db
    .from('stickies')
    .select(stickySelect)
    .eq('organisation_id', organisationId)
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as OpenKbSticky[]
}

export const createSticky = async (input: OpenKbStickyInput): Promise<OpenKbSticky> => {
  const { data, error } = await db
    .from('stickies')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id || null,
      profile_id: input.profile_id,
      title: input.title.trim(),
      description_json: input.description_json,
      description_html: input.description_html?.trim() || null,
      description_text: input.description_text?.trim() || null,
      status: 'active',
    })
    .select(stickySelect)
    .single()

  if (error) throw error

  return data as unknown as OpenKbSticky
}

export const updateSticky = async ({
  id,
  organisation_id,
  ...input
}: OpenKbStickyUpdateInput): Promise<OpenKbSticky> => {
  const { data, error } = await db
    .from('stickies')
    .update({
      project_id: input.project_id === undefined ? undefined : input.project_id || null,
      title: input.title?.trim(),
      description_json: input.description_json,
      description_html: input.description_html?.trim() || input.description_html,
      description_text: input.description_text?.trim() || input.description_text,
    })
    .eq('organisation_id', organisation_id)
    .eq('id', id)
    .select(stickySelect)
    .single()

  if (error) throw error

  return data as unknown as OpenKbSticky
}

export const deleteSticky = async ({
  organisationId,
  stickyId,
}: {
  organisationId: string
  stickyId: string
}) => {
  const { error } = await db
    .from('stickies')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', stickyId)

  if (error) throw error
}
