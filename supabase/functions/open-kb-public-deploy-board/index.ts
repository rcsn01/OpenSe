export {}

import { getCorsHeaders, handleCorsPreflight } from '../_shared/cors.ts'
import { restFetch } from '../_shared/open-kb.ts'

declare const Deno: {
  serve: (handler: (req: Request) => Promise<Response> | Response) => void
  env: {
    get: (key: string) => string | undefined
  }
}

type PublicDeployBoard = {
  board_id: string
  organisation_id: string
  project_id: string
  slug: string
  title: string
  description_text: string | null
  status: string | null
  payload: Record<string, unknown>
  project_name: string
  project_identifier: string
  project_description_text: string | null
}

type PublicDeployBoardIssue = {
  issue_id: string
  project_id: string
  sequence_id: number | null
  title: string
  description_text: string | null
  priority: string
  state_id: string | null
  state_name: string | null
  state_group_key: string | null
  state_color: string | null
  start_date: string | null
  target_date: string | null
  completed_at: string | null
  created_at: string
  updated_at: string | null
}

const issueColumns = [
  'issue_id',
  'project_id',
  'sequence_id',
  'title',
  'description_text',
  'priority',
  'state_id',
  'state_name',
  'state_group_key',
  'state_color',
  'start_date',
  'target_date',
  'completed_at',
  'created_at',
  'updated_at',
].join(',')

const json = (req: Request, status: number, body: Record<string, unknown>) =>
  new Response(JSON.stringify(body), {
    status,
    headers: {
      ...getCorsHeaders(req),
      'Content-Type': 'application/json',
    },
  })

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return handleCorsPreflight(req)
  }

  if (req.method !== 'POST') {
    return json(req, 405, { error: 'Method not allowed' })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')
  if (!supabaseUrl || !serviceRoleKey) {
    return json(req, 503, { error: 'Public deploy board endpoint is not configured' })
  }

  const body = (await req.json().catch(() => ({}))) as { slug?: unknown }
  const slug = typeof body.slug === 'string' ? body.slug.trim() : ''
  if (!slug) {
    return json(req, 200, { board: null, issues: [] })
  }

  const slugFilter = `ilike.${encodeURIComponent(slug)}`

  try {
    const boards = await restFetch<PublicDeployBoard[]>(
      supabaseUrl,
      serviceRoleKey,
      `public_deploy_boards?slug=${slugFilter}&select=*&limit=1`,
    )
    const board = boards[0] ?? null

    if (!board) {
      return json(req, 200, { board: null, issues: [] })
    }

    const issues = await restFetch<PublicDeployBoardIssue[]>(
      supabaseUrl,
      serviceRoleKey,
      `public_deploy_board_issues?slug=${slugFilter}&select=${issueColumns}` +
        `&order=state_sort_order.asc,sequence_id.asc.nullslast,created_at.desc`,
    )

    return json(req, 200, { board, issues })
  } catch (error) {
    return json(req, 500, {
      error: error instanceof Error ? error.message : 'Failed to load public deploy board',
    })
  }
})
