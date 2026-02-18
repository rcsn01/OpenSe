import { db } from '../lib/supabase'
import { GalleryWorkflow } from '../hooks/useGallery'
import { supabase } from '../lib/supabase'

export const listGalleryTemplates = async (): Promise<GalleryWorkflow[]> => {
  const { data, error } = await db
    .from('workflows')
    .select('id, name, description, created_at, owner_id, org_id, graph_data')
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  const ownerIds = [...new Set((data ?? []).map((row) => row.owner_id).filter(Boolean))]
  const ownerMap = new Map<string, { full_name: string | null }>()

  if (ownerIds.length > 0) {
    const { data: profiles, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('id', ownerIds)

    if (profilesError) throw profilesError

    for (const profile of profiles ?? []) {
      ownerMap.set(profile.id, { full_name: profile.full_name })
    }
  }

  return (
    data?.map((item) => ({
      ...item,
      owner: ownerMap.get(item.owner_id) ?? null,
    })) ?? []
  ) as GalleryWorkflow[]
}
