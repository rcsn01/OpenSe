import { useQuery } from '@tanstack/react-query'
import { supabase } from '../lib/supabase'
import { WorkflowRow } from '../components/dashboard/types'

export type GalleryWorkflow = WorkflowRow & {
  description: string | null;
  graph_data: any;
  owner: { full_name: string | null } | null;
};

export const useGallery = () => {
  return useQuery({
    queryKey: ['galleryTemplates'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, description, created_at, owner_id, org_id, graph_data, owner:profiles!workflows_owner_id_fkey(full_name)')
        .eq('is_template', true)
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((item) => ({
        ...item,
        owner: Array.isArray(item.owner) ? item.owner[0] : item.owner,
      })) as GalleryWorkflow[]
    },
  })
}