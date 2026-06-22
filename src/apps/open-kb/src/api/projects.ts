import { db } from '../supabaseClient'
import type {
  OpenKbProfile,
  Project,
  ProjectInput,
  ProjectMember,
  ProjectMemberInput,
  ProjectMessage,
  ProjectMessageInput,
  ProjectSummary,
  ProjectTab,
  ProjectTabInput,
  ProjectTabUpdateInput,
  ProjectUpdateInput,
} from '../types'
import { defaultProjectTabKeys, projectTabDefinitionByKey } from '../lib/projectTabs'

const projectSelect = `
  id,
  organisation_id,
  team_id,
  name,
  identifier,
  description_text,
  status,
  visibility,
  sort_order,
  created_at,
  updated_at,
  team:teams!projects_team_id_fkey(id, name, slug, description_text, status)
`

const projectMemberSelect = `
  id,
  organisation_id,
  project_id,
  profile_id,
  role,
  created_by,
  created_at,
  updated_at,
  deleted_at,
  profile:profiles(id, email, full_name, username, avatar_url)
`

const projectTabSelect = `
  id,
  organisation_id,
  project_id,
  tab_key,
  label,
  sort_order,
  metadata,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at
`

const projectMessageSelect = `
  id,
  organisation_id,
  project_id,
  profile_id,
  description_json,
  description_html,
  description_text,
  metadata,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  profile:profiles(id, email, full_name, username, avatar_url)
`

const normalizeIdentifier = (value: string) =>
  value.trim().toUpperCase().replace(/[^A-Z0-9]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 12)

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

type ProjectRow = Omit<Project, 'team'> & {
  team?: Project['team'] | Project['team'][] | null
}

const normalizeProject = (row: ProjectRow): Project => ({
  ...row,
  team: normalizeSingle(row.team),
})

export const buildProjectIdentifier = (name: string) => {
  const parts = name.trim().split(/\s+/).filter(Boolean)
  const acronym = parts.map((part) => part[0]).join('')
  return normalizeIdentifier(acronym.length >= 2 ? acronym : name) || 'KB'
}

export const fetchProjects = async (organisationId: string): Promise<Project[]> => {
  const { data, error } = await db
    .from('projects')
    .select(projectSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as unknown as ProjectRow[]).map(normalizeProject)
}

export const fetchProject = async (organisationId: string, projectId: string): Promise<Project> => {
  const { data, error } = await db
    .from('projects')
    .select(projectSelect)
    .eq('organisation_id', organisationId)
    .eq('id', projectId)
    .is('deleted_at', null)
    .single()

  if (error) throw error

  return normalizeProject(data as unknown as ProjectRow)
}

export const createProject = async (input: ProjectInput): Promise<Project> => {
  const payload = {
    organisation_id: input.organisation_id,
    team_id: input.team_id || null,
    name: input.name.trim(),
    identifier: normalizeIdentifier(input.identifier),
    description_text: input.description_text?.trim() || null,
  }

  const { data, error } = await db
    .from('projects')
    .insert(payload)
    .select(projectSelect)
    .single()

  if (error) throw error

  return normalizeProject(data as unknown as ProjectRow)
}

export const updateProject = async ({ id, organisation_id, ...input }: ProjectUpdateInput): Promise<Project> => {
  const payload = {
    ...input,
    name: input.name?.trim(),
    description_text: input.description_text?.trim() || input.description_text,
    team_id: input.team_id === undefined ? undefined : input.team_id || null,
  }

  const { data, error } = await db
    .from('projects')
    .update(payload)
    .eq('organisation_id', organisation_id)
    .eq('id', id)
    .select(projectSelect)
    .single()

  if (error) throw error

  return normalizeProject(data as unknown as ProjectRow)
}

export const fetchProjectSummary = async (
  organisationId: string,
): Promise<ProjectSummary> => {
  const [projects, issues, pages, cycles, modules] = await Promise.all([
    db.from('projects').select('id', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null),
    db.from('issues').select('id', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null),
    db.from('pages').select('id', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null),
    db.from('cycles').select('id', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null),
    db.from('modules').select('id', { count: 'exact', head: true }).eq('organisation_id', organisationId).is('deleted_at', null),
  ])

  const error = [projects.error, issues.error, pages.error, cycles.error, modules.error].find(Boolean)
  if (error) throw error

  return {
    project_count: projects.count ?? 0,
    issue_count: issues.count ?? 0,
    page_count: pages.count ?? 0,
    cycle_count: cycles.count ?? 0,
    module_count: modules.count ?? 0,
  }
}

export const fetchProjectMembers = async (
  organisationId: string,
  projectId: string,
): Promise<ProjectMember[]> => {
  const { data, error } = await db
    .from('project_members')
    .select(projectMemberSelect)
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('role', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error

  return ((data ?? []) as Array<ProjectMember & { profile: OpenKbProfile | OpenKbProfile[] | null }>).map((row) => ({
    ...row,
    profile: normalizeSingle(row.profile),
  }))
}

export const upsertProjectMember = async (input: ProjectMemberInput): Promise<ProjectMember> => {
  const { data, error } = await db
    .from('project_members')
    .upsert(
      {
        organisation_id: input.organisation_id,
        project_id: input.project_id,
        profile_id: input.profile_id,
        role: input.role,
        deleted_at: null,
      },
      { onConflict: 'project_id,profile_id' },
    )
    .select(projectMemberSelect)
    .single()

  if (error) throw error

  const item = data as unknown as ProjectMember & { profile: OpenKbProfile | OpenKbProfile[] | null }
  return {
    ...item,
    profile: normalizeSingle(item.profile),
  }
}

export const removeProjectMember = async ({
  organisationId,
  memberId,
}: {
  organisationId: string
  memberId: string
}) => {
  const { error } = await db
    .from('project_members')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('id', memberId)

  if (error) throw error
}

export const defaultProjectTabsForProject = (
  organisationId: string,
  projectId: string,
): ProjectTab[] =>
  defaultProjectTabKeys.map((tabKey, index) => {
    const definition = projectTabDefinitionByKey.get(tabKey)
    return {
      id: `default-${projectId}-${tabKey}`,
      organisation_id: organisationId,
      project_id: projectId,
      tab_key: tabKey,
      label: definition?.label ?? tabKey,
      sort_order: (index + 1) * 10,
      metadata: tabKey === 'list' ? { required: true } : {},
      created_by: null,
      updated_by: null,
      created_at: new Date(0).toISOString(),
      updated_at: null,
      deleted_at: null,
    }
  })

export const fetchProjectTabs = async (
  organisationId: string,
  projectId: string,
): Promise<ProjectTab[]> => {
  const { data, error } = await db
    .from('project_tabs')
    .select(projectTabSelect)
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('sort_order', { ascending: true })
    .order('created_at', { ascending: true })

  if (error) throw error

  const tabs = (data ?? []) as unknown as ProjectTab[]
  return tabs.length > 0 ? tabs : defaultProjectTabsForProject(organisationId, projectId)
}

export const addProjectTab = async (input: ProjectTabInput): Promise<ProjectTab> => {
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id,
    tab_key: input.tab_key,
    label: input.label.trim(),
    sort_order: input.sort_order ?? 0,
    metadata: input.metadata ?? {},
  }

  const { data, error } = await db
    .from('project_tabs')
    .insert(payload)
    .select(projectTabSelect)
    .single()

  if (error) throw error

  return data as unknown as ProjectTab
}

export const updateProjectTab = async ({
  id,
  organisation_id,
  project_id,
  ...input
}: ProjectTabUpdateInput): Promise<ProjectTab> => {
  const payload = {
    ...input,
    label: input.label?.trim(),
  }

  const { data, error } = await db
    .from('project_tabs')
    .update(payload)
    .eq('organisation_id', organisation_id)
    .eq('project_id', project_id)
    .eq('id', id)
    .select(projectTabSelect)
    .single()

  if (error) throw error

  return data as unknown as ProjectTab
}

export const removeProjectTab = async (input: Pick<ProjectTabUpdateInput, 'id' | 'organisation_id' | 'project_id'>) =>
  updateProjectTab({ ...input, deleted_at: new Date().toISOString() })

export const fetchProjectMessages = async (
  organisationId: string,
  projectId: string,
): Promise<ProjectMessage[]> => {
  const { data, error } = await db
    .from('project_messages')
    .select(projectMessageSelect)
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return ((data ?? []) as Array<ProjectMessage & { profile: OpenKbProfile | OpenKbProfile[] | null }>).map((row) => ({
    ...row,
    profile: normalizeSingle(row.profile),
  }))
}

export const createProjectMessage = async (input: ProjectMessageInput): Promise<ProjectMessage> => {
  const { data, error } = await db
    .from('project_messages')
    .insert({
      organisation_id: input.organisation_id,
      project_id: input.project_id,
      description_json: input.description_json,
      description_html: input.description_html?.trim() || null,
      description_text: input.description_text?.trim() || null,
    })
    .select(projectMessageSelect)
    .single()

  if (error) throw error

  const item = data as unknown as ProjectMessage & { profile: OpenKbProfile | OpenKbProfile[] | null }
  return {
    ...item,
    profile: normalizeSingle(item.profile),
  }
}
