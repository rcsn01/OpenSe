import { useQuery } from '@tanstack/react-query'
import { listOrganisationMembers, listUserOrganisations } from '../../api/organisations'
import { OrgSimple } from '../../types/organisation'

export type { OrgSimple }

export const useUserOrganisations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userOrganisations', userId],
    queryFn: () => (userId ? listUserOrganisations(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useOrganisationMembers = (orgId: string | undefined) => {
  return useQuery({
    queryKey: ['organisationMembers', orgId],
    queryFn: () => (orgId ? listOrganisationMembers(orgId) : []),
    enabled: !!orgId,
  })
}
