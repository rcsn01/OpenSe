import { db } from '../supabaseClient'
import type { OpenKbProfile, OpenKbTeam, OpenKbTeamInput, OpenKbTeamMember, OpenKbTeamMemberInput, OpenKbTeamMemberRemoveInput, OpenKbTeamUpdateInput } from '../types'
import { getRandomOpenKbLightColor, normalizeHexColor } from '../lib/openKbColors'

const teamSelect = `
  id,
  organisation_id,
  name,
  slug,
  description_text,
  status,
  metadata,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const teamMemberSelect = `
  id,
  organisation_id,
  team_id,
  profile_id,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  profile:profiles(id, email, full_name, username, avatar_url)
`

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const buildTeamSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

export const buildTeamInsertPayload = (input: OpenKbTeamInput) => {
  const metadata = input.metadata && typeof input.metadata === 'object' && !Array.isArray(input.metadata)
    ? { ...input.metadata }
    : {}
  metadata.color = normalizeHexColor(metadata.color) ?? getRandomOpenKbLightColor()

  return {
    organisation_id: input.organisation_id,
    name: input.name.trim(),
    slug: buildTeamSlug(input.slug || input.name),
    description_text: input.description_text?.trim() || null,
    status: 'active',
    metadata,
    project_id: null,
    issue_id: null,
  }
}

export const fetchTeams = async (organisationId: string): Promise<OpenKbTeam[]> => {
  const { data, error } = await db
    .from('teams')
    .select(teamSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('name', { ascending: true })

  if (error) throw error

  return (data ?? []) as OpenKbTeam[]
}

export const createTeam = async (input: OpenKbTeamInput): Promise<OpenKbTeam> => {
  const { data, error } = await db
    .from('teams')
    .insert(buildTeamInsertPayload(input))
    .select(teamSelect)
    .single()

  if (error) throw error

  return data as OpenKbTeam
}

export const updateTeam = async ({ id, organisation_id, ...input }: OpenKbTeamUpdateInput): Promise<OpenKbTeam> => {
  const payload = {
    ...input,
    name: input.name?.trim(),
    slug: input.slug === undefined ? undefined : input.slug ? buildTeamSlug(input.slug) : null,
    description_text: input.description_text?.trim() || input.description_text,
    project_id: null,
    issue_id: null,
  }

  const { data, error } = await db
    .from('teams')
    .update(payload)
    .eq('organisation_id', organisation_id)
    .eq('id', id)
    .select(teamSelect)
    .single()

  if (error) throw error

  return data as OpenKbTeam
}

export const deleteTeam = async ({
  organisationId,
  teamId,
}: {
  organisationId: string
  teamId: string
}) => {
  const { error } = await db
    .from('teams')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', teamId)

  if (error) throw error
}

export const fetchTeamMembers = async (
  organisationId: string,
  teamId?: string | null,
): Promise<OpenKbTeamMember[]> => {
  let query = db
    .from('team_members')
    .select(teamMemberSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: true })

  if (teamId) {
    query = query.eq('team_id', teamId)
  }

  const { data, error } = await query
  if (error) throw error

  return ((data ?? []) as Array<OpenKbTeamMember & { profile: OpenKbProfile | OpenKbProfile[] | null }>).map((row) => ({
    ...row,
    profile: normalizeSingle(row.profile),
  }))
}

export const addTeamMember = async (input: OpenKbTeamMemberInput): Promise<OpenKbTeamMember> => {
  const { data, error } = await db
    .from('team_members')
    .insert({
      organisation_id: input.organisation_id,
      team_id: input.team_id,
      profile_id: input.profile_id,
    })
    .select(teamMemberSelect)
    .single()

  if (error) throw error

  const row = data as unknown as OpenKbTeamMember & { profile: OpenKbProfile | OpenKbProfile[] | null }
  return {
    ...row,
    profile: normalizeSingle(row.profile),
  }
}

export const removeTeamMember = async ({
  organisationId,
  memberId,
}: OpenKbTeamMemberRemoveInput) => {
  const { error } = await db
    .from('team_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', memberId)

  if (error) throw error
}
