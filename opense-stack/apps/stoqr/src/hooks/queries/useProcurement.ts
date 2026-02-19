import { useQuery } from '@tanstack/react-query'
import { fetchProcurementProducts } from '../../api/procurement'

export const useProcurementProducts = (companyId: string | null) =>
  useQuery({
    queryKey: ['stoqr', 'procurement', 'products', companyId],
    queryFn: () => fetchProcurementProducts(companyId as string),
    enabled: !!companyId,
  })
