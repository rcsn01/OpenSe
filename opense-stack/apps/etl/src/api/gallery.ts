import { db, supabase } from '../lib/supabase'
import type { WorkflowRow } from '../components/dashboard/types'

export type GalleryWorkflow = WorkflowRow & {
  description: string | null
  graph_data: any
  owner: { full_name: string | null } | null
}

export const listGalleryTemplates = async (): Promise<GalleryWorkflow[]> => {
  const { data, error } = await db
    .from('workflows')
    .select('id, name, description, created_at, owner_id, org_id, graph_data')
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  const ownerIds = Array.from(new Set((data ?? []).map((item: any) => item.owner_id).filter(Boolean)))
  let ownerLookup = new Map<string, { full_name: string | null }>()

  if (ownerIds.length > 0) {
    const { data: owners } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ownerIds)

    ownerLookup = new Map((owners ?? []).map((owner: any) => [owner.id, { full_name: owner.full_name ?? null }]))
  }

  return (
    data?.map((item: any) => ({
      ...item,
      owner: ownerLookup.get(item.owner_id) ?? null,
    })) ?? []
  ) as GalleryWorkflow[]
}
