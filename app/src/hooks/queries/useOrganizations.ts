import { useQuery } from '@tanstack/react-query'
import { listOrganizationMembers, listUserOrganizations } from '../../api/organizations'
import { OrgSimple } from '../../types/organization'

export type { OrgSimple }

export const useUserOrganizations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userOrganizations', userId],
    queryFn: () => (userId ? listUserOrganizations(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useOrganizationMembers = (orgId: string | undefined) => {
  return useQuery({
    queryKey: ['organizationMembers', orgId],
    queryFn: () => (orgId ? listOrganizationMembers(orgId) : []),
    enabled: !!orgId,
  })
}
