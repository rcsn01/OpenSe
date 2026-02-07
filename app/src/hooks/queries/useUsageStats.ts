import { useQuery } from '@tanstack/react-query'
import { getOrgUsageStats, getOrgActiveUsers } from '../../api/usage'

/**
 * Fetches usage summary for an organisation (last 30 days).
 */
export const useOrgUsageStats = (orgId: string | null | undefined) => {
  return useQuery({
    queryKey: ['orgUsageStats', orgId],
    queryFn: () => (orgId ? getOrgUsageStats(orgId) : null),
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2, // 2 minutes
    refetchOnWindowFocus: false,
  })
}

/**
 * Fetches active users for an organisation (last 30 days).
 */
export const useOrgActiveUsers = (orgId: string | null | undefined) => {
  return useQuery({
    queryKey: ['orgActiveUsers', orgId],
    queryFn: () => (orgId ? getOrgActiveUsers(orgId) : []),
    enabled: !!orgId,
    staleTime: 1000 * 60 * 2,
    refetchOnWindowFocus: false,
  })
}
