import { useQuery } from '@tanstack/react-query'
import { listExecutionLogs } from '../../api/activities'
import { useAuth } from '../../context/AuthContext'
import { mockExecutionLogs } from '../../lib/demoData'
import type { ExecutionLog } from '../../components/shared/ActivityLogTable'

export const useExecutionLogs = (userId: string | undefined, orgId: string | null | undefined) => {
  const { isDemoUser } = useAuth()

  return useQuery<ExecutionLog[]>({
    queryKey: ['executionLogs', userId, orgId, isDemoUser],
    queryFn: () => {
      if (isDemoUser) {
        // Return mock execution logs for demo user
        // Filter by orgId if specified
        if (orgId) {
          return mockExecutionLogs
            .filter((log) => log.org_id === orgId)
            .map((log) => ({
              id: log.id,
              workflow_id: log.workflow_id,
              status: log.status,
              started_at: log.started_at,
              completed_at: log.finished_at,
              error_message: log.error_message,
              workflows: { name: log.workflow_name },
              profiles: { email: '', full_name: log.user_id },
            }))
        }
        return mockExecutionLogs.map((log) => ({
          id: log.id,
          workflow_id: log.workflow_id,
          status: log.status,
          started_at: log.started_at,
          completed_at: log.finished_at,
          error_message: log.error_message,
          workflows: { name: log.workflow_name },
          profiles: { email: '', full_name: log.user_id },
        }))
      }
      return userId ? listExecutionLogs(userId, orgId) : []
    },
    enabled: !!userId,
  })
}
