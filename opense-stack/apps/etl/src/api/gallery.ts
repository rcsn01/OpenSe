import { db } from '../lib/supabase'
import type { WorkflowRow } from '../components/dashboard/types'

export type GalleryWorkflow = WorkflowRow & {
  description: string | null
  graph_data: any
  owner: { full_name: string | null } | null
}

export const listGalleryTemplates = async (): Promise<GalleryWorkflow[]> => {
  const { data, error } = await db
    .from('workflows')
    .select('id, name, description, created_at, owner_id, org_id, graph_data, owner:profiles!workflows_owner_id_fkey(full_name)')
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (
    data?.map((item) => ({
      ...item,
      owner: Array.isArray(item.owner) ? item.owner[0] ?? null : item.owner ?? null,
    })) ?? []
  ) as GalleryWorkflow[]
}
