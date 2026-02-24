import { useQuery } from '@tanstack/react-query'
import { fetchReportsData } from '../../api/reports'

const reportsKey = (companyId: string | null) => ['stoqr', 'reports', companyId] as const

export const useReportsData = (companyId: string | null) =>
  useQuery({
    queryKey: reportsKey(companyId),
    queryFn: () => fetchReportsData(companyId as string),
    enabled: !!companyId,
    retry: false,
    staleTime: 60_000,
  })
