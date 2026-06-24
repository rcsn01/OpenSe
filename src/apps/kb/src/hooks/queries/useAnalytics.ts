import { useQuery } from '@tanstack/react-query'
import { fetchAnalyticsSummary } from '../../api/analytics'

export const useAnalyticsSummary = (organisationId: string | null) =>
  useQuery({
    queryKey: ['open-kb', 'analytics-summary', organisationId],
    queryFn: () => fetchAnalyticsSummary(organisationId ?? ''),
    enabled: Boolean(organisationId),
  })
