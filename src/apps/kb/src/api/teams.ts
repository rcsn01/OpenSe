import { db } from '../supabaseClient'
import type { OpenKbTeam, OpenKbTeamInput, OpenKbTeamUpdateInput } from '../types'

const teamSelect = `
  id,
  organisation_id,
  name,
  slug,
  description_text,
  status,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

export const buildTeamSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48)

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
  const payload = {
    organisation_id: input.organisation_id,
    name: input.name.trim(),
    slug: buildTeamSlug(input.slug || input.name),
    description_text: input.description_text?.trim() || null,
    status: 'active',
    project_id: null,
    issue_id: null,
    page_id: null,
  }

  const { data, error } = await db
    .from('teams')
    .insert(payload)
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
    page_id: null,
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
