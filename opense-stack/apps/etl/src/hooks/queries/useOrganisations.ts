import { useQuery } from '@tanstack/react-query'
import { listOrganisationMembers, listUserOrganisations } from '../../api/organisations'
import { OrgSimple } from '../../types/organisation'
import type { Member } from '../../components/settings/types'
import { organisationKeys } from './queryKeys'

export type { OrgSimple }

export const useUserOrganisations = (userId: string | undefined) => {
  return useQuery<OrgSimple[]>({
    queryKey: organisationKeys.userOrganisations(userId),
    queryFn: () => (userId ? listUserOrganisations(userId) : []),
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useOrganisationMembers = (orgId: string | undefined) => {
  return useQuery<Member[]>({
    queryKey: organisationKeys.members(orgId),
    queryFn: () => (orgId ? listOrganisationMembers(orgId) : []),
    enabled: !!orgId,
  })
}
