import { useQuery } from '@tanstack/react-query'
import { listExecutionLogs } from '../../api/activities'
import type { ExecutionLog } from '../../components/shared/ActivityLogTable'
import { activityKeys } from './queryKeys'

export const useExecutionLogs = (userId: string | undefined, orgId: string | null | undefined) => {
  return useQuery<ExecutionLog[]>({
    queryKey: activityKeys.executionLogs(userId, orgId),
    queryFn: () => (userId ? listExecutionLogs(userId, orgId) : []),
    enabled: !!userId,
  })
}
