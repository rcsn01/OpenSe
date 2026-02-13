import { useQuery } from '@tanstack/react-query'
import { WorkflowRow } from '../components/dashboard/types'
import { listGalleryTemplates } from '../api/gallery'
import { useAuth } from '@repo/shared/auth/context'
import { mockGalleryTemplates } from '../lib/demoData'

export type GalleryWorkflow = WorkflowRow & {
  description: string | null;
  graph_data: any;
  owner: { full_name: string | null } | null;
};

export const useGallery = () => {
  const { isDemoUser } = useAuth()

  return useQuery({
    queryKey: ['galleryTemplates', isDemoUser],
    queryFn: () => {
      if (isDemoUser) {
        return mockGalleryTemplates as GalleryWorkflow[]
      }
      return listGalleryTemplates()
    },
  })
}