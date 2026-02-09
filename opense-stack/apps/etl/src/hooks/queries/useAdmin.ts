import { useQuery } from '@tanstack/react-query'
import { OrgRow, UsageStats, UserUsageStats, AdminUserRow } from '../../components/admin/types'
import { listAdminOrgs, listAdminUsers, getAllOrgsUsageStats, getAllUsersUsageStats } from '../../api/organisations'

export const useAdminUsers = () => {
  return useQuery<AdminUserRow[]>({
    queryKey: ['adminUsers'],
    queryFn: () => listAdminUsers(),
  })
}

export const useAdminOrgs = () => {
  return useQuery<OrgRow[]>({
    queryKey: ['adminOrgs'],
    queryFn: () => listAdminOrgs(),
  })
}

export const useOrgUsageStats = () => {
  return useQuery<Map<string, UsageStats>>({
    queryKey: ['adminOrgUsageStats'],
    queryFn: () => getAllOrgsUsageStats(),
    staleTime: 30000, // Cache for 30 seconds to reduce API calls
  })
}

export const useUserUsageStats = () => {
  return useQuery<Map<string, UserUsageStats>>({
    queryKey: ['adminUserUsageStats'],
    queryFn: () => getAllUsersUsageStats(),
    staleTime: 30000,
  })
}
