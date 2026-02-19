import { useQuery } from '@tanstack/react-query'
import { fetchAlertProducts } from '../../api/alerts'

export const useAlertProducts = (companyId: string | null) =>
  useQuery({
    queryKey: ['stoqr', 'alerts', companyId],
    queryFn: () => fetchAlertProducts(companyId as string),
    enabled: !!companyId,
  })
