import { db } from '../supabaseClient'
import type { KnowledgePage, PageInput, PageUpdateInput, PageVersion } from '../types'

const pageSelect = `
  id,
  organisation_id,
  project_id,
  title,
  slug,
  content_json,
  content_html,
  content_text,
  status,
  created_by,
  updated_by,
  created_at,
  updated_at,
  deleted_at,
  project:projects(id, name, identifier)
`

const pageVersionSelect = `
  id,
  organisation_id,
  project_id,
  page_id,
  title,
  slug,
  description_json,
  description_html,
  description_text,
  status,
  payload,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

export const buildPageSlug = (title: string) =>
  title
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80)

export const fetchPages = async ({
  organisationId,
  projectId,
}: {
  organisationId: string
  projectId?: string | null
}): Promise<KnowledgePage[]> => {
  let query = db
    .from('pages')
    .select(pageSelect)
    .eq('organisation_id', organisationId)
    .is('deleted_at', null)
    .order('updated_at', { ascending: false, nullsFirst: false })
    .order('created_at', { ascending: false })

  if (projectId) {
    query = query.eq('project_id', projectId)
  }

  const { data, error } = await query
  if (error) throw error

  return (data ?? []) as unknown as KnowledgePage[]
}

export const fetchPage = async (organisationId: string, pageId: string): Promise<KnowledgePage> => {
  const { data, error } = await db
    .from('pages')
    .select(pageSelect)
    .eq('organisation_id', organisationId)
    .eq('id', pageId)
    .is('deleted_at', null)
    .single()

  if (error) throw error

  return data as unknown as KnowledgePage
}

export const createPage = async (input: PageInput): Promise<KnowledgePage> => {
  const payload = {
    organisation_id: input.organisation_id,
    project_id: input.project_id || null,
    title: input.title.trim(),
    slug: input.slug?.trim() || buildPageSlug(input.title),
    content_json: input.content_json ?? undefined,
    content_html: input.content_html?.trim() || null,
    content_text: input.content_text?.trim() || null,
    status: input.status,
  }

  const { data, error } = await db
    .from('pages')
    .insert(payload)
    .select(pageSelect)
    .single()

  if (error) throw error

  return data as unknown as KnowledgePage
}

const createPageVersionSnapshot = async (page: KnowledgePage) => {
  const { error } = await db
    .from('page_versions')
    .insert({
      organisation_id: page.organisation_id,
      project_id: page.project_id,
      page_id: page.id,
      title: page.title,
      slug: page.slug,
      description_json: page.content_json,
      description_html: page.content_html,
      description_text: page.content_text,
      status: page.status,
      payload: {
        page_status: page.status,
        captured_updated_at: page.updated_at,
        captured_created_at: page.created_at,
      },
    })

  if (error) throw error
}

export const updatePage = async ({ id, organisation_id, ...input }: PageUpdateInput): Promise<KnowledgePage> => {
  const current = await fetchPage(organisation_id, id)
  await createPageVersionSnapshot(current)

  const payload = {
    ...input,
    title: input.title?.trim(),
    slug: input.slug?.trim() || input.slug,
    content_html: input.content_html?.trim() || input.content_html,
    content_text: input.content_text?.trim() || input.content_text,
    project_id: input.project_id || null,
  }

  const { data, error } = await db
    .from('pages')
    .update(payload)
    .eq('organisation_id', organisation_id)
    .eq('id', id)
    .select(pageSelect)
    .single()

  if (error) throw error

  return data as unknown as KnowledgePage
}

export const fetchPageVersions = async (
  organisationId: string,
  pageId: string,
): Promise<PageVersion[]> => {
  const { data, error } = await db
    .from('page_versions')
    .select(pageVersionSelect)
    .eq('organisation_id', organisationId)
    .eq('page_id', pageId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data ?? []) as unknown as PageVersion[]
}
