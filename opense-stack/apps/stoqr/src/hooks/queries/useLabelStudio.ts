import { useQuery } from '@tanstack/react-query'
import { fetchLabelProducts } from '../../api/labelStudio'

const labelStudioKeys = {
  products: (companyId: string | null, search: string) =>
    ['stoqr', 'label-studio', 'products', companyId, search] as const,
}

export const useLabelProducts = (companyId: string | null, search: string) =>
  useQuery({
    queryKey: labelStudioKeys.products(companyId, search),
    queryFn: () => fetchLabelProducts(companyId as string, search),
    enabled: !!companyId,
  })
