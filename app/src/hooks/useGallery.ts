import { useQuery } from '@tanstack/react-query'
import { WorkflowRow } from '../components/dashboard/types'
import { listGalleryTemplates } from '../api/gallery'

export type GalleryWorkflow = WorkflowRow & {
  description: string | null;
  graph_data: any;
  owner: { full_name: string | null } | null;
};

export const useGallery = () => {
  return useQuery({
    queryKey: ['galleryTemplates'],
    queryFn: listGalleryTemplates,
  })
}