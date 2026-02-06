import { useQuery } from '@tanstack/react-query'
import { listExecutionLogs } from '../../api/activities'
import { useAuth } from '../../context/AuthContext'
import { mockExecutionLogs } from '../../lib/demoData'

export const useExecutionLogs = (userId: string | undefined, orgId: string | null | undefined) => {
  const { isDemoUser } = useAuth()

  return useQuery({
    queryKey: ['executionLogs', userId, orgId, isDemoUser],
    queryFn: () => {
      if (isDemoUser) {
        // Return mock execution logs for demo user
        // Filter by orgId if specified
        if (orgId) {
          return mockExecutionLogs.filter(log => log.org_id === orgId)
        }
        return mockExecutionLogs
      }
      return userId ? listExecutionLogs(userId, orgId) : []
    },
    enabled: !!userId,
  })
}
