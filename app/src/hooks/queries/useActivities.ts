import { useQuery } from '@tanstack/react-query'
import { listExecutionLogs } from '../../api/activities'

export const useExecutionLogs = (userId: string | undefined, orgId: string | null | undefined) => {
  return useQuery({
    queryKey: ['executionLogs', userId, orgId],
    queryFn: () => (userId ? listExecutionLogs(userId, orgId) : []),
    enabled: !!userId,
  })
}
