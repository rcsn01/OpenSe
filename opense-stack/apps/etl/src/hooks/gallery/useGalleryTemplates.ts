import { useQuery } from '@tanstack/react-query'
import { useAuth } from '@repo/shared/auth/context'
import { listGalleryTemplates, type GalleryWorkflow } from '../../api/gallery'
import { mockGalleryTemplates } from '../../lib/demoData'
import { galleryKeys } from '../queries/queryKeys'

export const useGalleryTemplates = () => {
  const { isDemoUser } = useAuth()

  return useQuery<GalleryWorkflow[]>({
    queryKey: galleryKeys.templates(isDemoUser),
    queryFn: () => {
      if (isDemoUser) {
        return mockGalleryTemplates as GalleryWorkflow[]
      }
      return listGalleryTemplates()
    },
  })
}
