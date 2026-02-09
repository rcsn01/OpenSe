import { supabase } from '../lib/supabase'
import { GalleryWorkflow } from '../hooks/useGallery'

export const listGalleryTemplates = async (): Promise<GalleryWorkflow[]> => {
  const { data, error } = await supabase
    .from('workflows')
    .select('id, name, description, created_at, owner_id, org_id, graph_data, owner:profiles!workflows_owner_id_fkey(full_name)')
    .eq('is_template', true)
    .order('created_at', { ascending: false })

  if (error) throw error

  return (
    data?.map((item) => ({
      ...item,
      owner: Array.isArray(item.owner) ? item.owner[0] : item.owner,
    })) ?? []
  ) as GalleryWorkflow[]
}
