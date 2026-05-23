import { useQuery } from '@tanstack/react-query'
import { listGalleryTemplates, type GalleryWorkflow } from '../../api/gallery'
import { galleryKeys } from '../queries/queryKeys'

export const useGalleryTemplates = () => {
  return useQuery<GalleryWorkflow[]>({
    queryKey: galleryKeys.templates(),
    queryFn: () => listGalleryTemplates(),
  })
}
