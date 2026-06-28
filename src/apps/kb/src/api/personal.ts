import { db } from '../supabaseClient'
import type { OpenKbPersonalItem, OpenKbVisitKind } from '../types'

const personalItemSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  profile_id,
  name,
  title,
  description_text,
  status,
  payload,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

export type PersonalItemInput = {
  organisationId: string
  profileId: string
  kind: OpenKbVisitKind
  projectId?: string | null
  issueId?: string | null
  title: string
  description?: string | null
  status?: string | null
  route: string
  identifier?: string | null
}

const entityFilter = <T extends { eq: (column: string, value: string) => T }>(
  query: T,
  input: Pick<PersonalItemInput, 'kind' | 'projectId' | 'issueId'>,
) : T => {
  if (input.kind === 'project') return query.eq('project_id', input.projectId ?? '')
  return query.eq('issue_id', input.issueId ?? '')
}

const findPersonalItem = async (
  table: 'user_favorites' | 'user_recent_visits',
  input: Pick<PersonalItemInput, 'organisationId' | 'profileId' | 'kind' | 'projectId' | 'issueId'>,
): Promise<OpenKbPersonalItem | null> => {
  let query = db
    .from(table)
    .select(personalItemSelect)
    .eq('organisation_id', input.organisationId)
    .eq('profile_id', input.profileId)
    .eq('name', input.kind)
    .is('deleted_at', null)

  query = entityFilter(query, input)

  const { data, error } = await query.maybeSingle()
  if (error) throw error

  return (data ?? null) as OpenKbPersonalItem | null
}

const toPayload = (input: PersonalItemInput) => ({
  route: input.route,
  identifier: input.identifier ?? null,
  description: input.description ?? null,
})

const toRow = (input: PersonalItemInput) => ({
  organisation_id: input.organisationId,
  profile_id: input.profileId,
  name: input.kind,
  project_id: input.projectId ?? null,
  issue_id: input.issueId ?? null,
  title: input.title.trim(),
  description_text: input.description?.trim() || null,
  status: input.status ?? 'active',
  payload: toPayload(input),
})

export const fetchFavorites = async ({
  organisationId,
  profileId,
}: {
  organisationId: string
  profileId: string
}): Promise<OpenKbPersonalItem[]> => {
  const { data, error } = await db
    .from('user_favorites')
    .select(personalItemSelect)
    .eq('organisation_id', organisationId)
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as OpenKbPersonalItem[]
}

export const fetchRecentVisits = async ({
  organisationId,
  profileId,
}: {
  organisationId: string
  profileId: string
}): Promise<OpenKbPersonalItem[]> => {
  const { data, error } = await db
    .from('user_recent_visits')
    .select(personalItemSelect)
    .eq('organisation_id', organisationId)
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })
    .limit(20)

  if (error) throw error

  return (data ?? []) as OpenKbPersonalItem[]
}

export const addFavorite = async (input: PersonalItemInput): Promise<OpenKbPersonalItem> => {
  const existing = await findPersonalItem('user_favorites', input)
  if (existing) return existing

  const { data, error } = await db
    .from('user_favorites')
    .insert(toRow(input))
    .select(personalItemSelect)
    .single()

  if (error) throw error

  return data as OpenKbPersonalItem
}

export const removeFavorite = async ({
  organisationId,
  favoriteId,
}: {
  organisationId: string
  favoriteId: string
}) => {
  const { error } = await db
    .from('user_favorites')
    .update({ deleted_at: new Date().toISOString(), status: 'deleted' })
    .eq('organisation_id', organisationId)
    .eq('id', favoriteId)

  if (error) throw error
}

export const recordRecentVisit = async (input: PersonalItemInput): Promise<OpenKbPersonalItem> => {
  const existing = await findPersonalItem('user_recent_visits', input)
  const row = toRow(input)

  if (existing) {
    const { data, error } = await db
      .from('user_recent_visits')
      .update({
        title: row.title,
        description_text: row.description_text,
        status: row.status,
        payload: row.payload,
      })
      .eq('organisation_id', input.organisationId)
      .eq('id', existing.id)
      .select(personalItemSelect)
      .single()

    if (error) throw error

    return data as OpenKbPersonalItem
  }

  const { data, error } = await db
    .from('user_recent_visits')
    .insert(row)
    .select(personalItemSelect)
    .single()

  if (error) throw error

  return data as OpenKbPersonalItem
}
