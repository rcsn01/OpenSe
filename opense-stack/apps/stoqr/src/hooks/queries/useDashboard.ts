import { useQuery } from '@tanstack/react-query'
import { fetchDashboardData } from '../../api/dashboard'

export const useDashboard = (companyId: string | null) => {
  return useQuery({
    queryKey: ['stoqr', 'dashboard', companyId],
    queryFn: () => fetchDashboardData(companyId as string),
    enabled: !!companyId,
  })
}
