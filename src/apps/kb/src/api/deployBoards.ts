import { db, supabase } from '../supabaseClient'
import type {
  ProjectDeployBoard,
  ProjectDeployBoardInput,
  ProjectDeployBoardUpdateInput,
  PublicDeployBoard,
  PublicDeployBoardIssue,
} from '../types'

type PublicDeployBoardResponse = {
  board: PublicDeployBoard | null
  issues: PublicDeployBoardIssue[]
}

const projectDeployBoardSelect = `
  id,
  organisation_id,
  project_id,
  name,
  slug,
  title,
  description_text,
  status,
  payload,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

export const buildDeployBoardSlug = (value: string) =>
  value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 64)

export const fetchProjectDeployBoards = async (
  organisationId: string,
  projectId: string,
): Promise<ProjectDeployBoard[]> => {
  const { data, error } = await db
    .from('project_deploy_boards')
    .select(projectDeployBoardSelect)
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as ProjectDeployBoard[]
}

export const createProjectDeployBoard = async (input: ProjectDeployBoardInput): Promise<ProjectDeployBoard> => {
  const slug = buildDeployBoardSlug(input.slug)
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id,
    issue_id: null,
    name: input.title?.trim() || slug,
    slug,
    title: input.title?.trim() || null,
    description_text: input.description_text?.trim() || null,
    status: input.status || 'active',
    payload: {},
  }

  const { data, error } = await db
    .from('project_deploy_boards')
    .insert(payload)
    .select(projectDeployBoardSelect)
    .single()

  if (error) throw error

  return data as ProjectDeployBoard
}

export const updateProjectDeployBoard = async ({
  id,
  organisation_id,
  project_id,
  ...input
}: ProjectDeployBoardUpdateInput): Promise<ProjectDeployBoard> => {
  const payload = {
    ...input,
    slug: input.slug === undefined ? undefined : buildDeployBoardSlug(input.slug),
    title: input.title?.trim() || input.title,
    name: input.title?.trim() || input.title,
    description_text: input.description_text?.trim() || input.description_text,
    issue_id: null,
  }

  const { data, error } = await db
    .from('project_deploy_boards')
    .update(payload)
    .eq('organisation_id', organisation_id)
    .eq('project_id', project_id)
    .eq('id', id)
    .select(projectDeployBoardSelect)
    .single()

  if (error) throw error

  return data as ProjectDeployBoard
}

export const deleteProjectDeployBoard = async ({
  organisationId,
  projectId,
  boardId,
}: {
  organisationId: string
  projectId: string
  boardId: string
}) => {
  const { error } = await db
    .from('project_deploy_boards')
    .update({ deleted_at: new Date().toISOString() })
    .eq('organisation_id', organisationId)
    .eq('project_id', projectId)
    .eq('id', boardId)

  if (error) throw error
}

// Public deploy boards are unauthenticated reads. The anon role has no direct
// table/view access, so these go through the open-kb-public-deploy-board Edge
// Function, which applies the public/active/not-deleted filters with the
// service role.
const fetchPublicDeployBoardData = async (slug: string): Promise<PublicDeployBoardResponse> => {
  const trimmed = slug.trim()
  if (!trimmed) return { board: null, issues: [] }

  const { data, error } = await supabase.functions.invoke<PublicDeployBoardResponse>(
    'open-kb-public-deploy-board',
    { body: { slug: trimmed } },
  )

  if (error) throw error

  return {
    board: data?.board ?? null,
    issues: data?.issues ?? [],
  }
}

export const fetchPublicDeployBoard = async (slug: string): Promise<PublicDeployBoard | null> => {
  const { board } = await fetchPublicDeployBoardData(slug)
  return board
}

export const fetchPublicDeployBoardIssues = async (slug: string): Promise<PublicDeployBoardIssue[]> => {
  const { issues } = await fetchPublicDeployBoardData(slug)
  return issues
}
