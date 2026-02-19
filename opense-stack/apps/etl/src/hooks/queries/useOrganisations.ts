import { useQuery } from '@tanstack/react-query'
import { listOrganisationMembers, listUserOrganisations } from '../../api/organisations'
import { OrgSimple } from '../../types/organisation'
import { useAuth } from '@repo/shared/auth/context'
import { mockOrganisation, mockOrgMembers, DEMO_ORG_ID } from '../../lib/demoData'
import type { Member } from '../../components/settings/types'
import { organisationKeys } from './queryKeys'

export type { OrgSimple }

export const useUserOrganisations = (userId: string | undefined) => {
  const { isDemoUser } = useAuth()

  return useQuery<OrgSimple[]>({
    queryKey: organisationKeys.userOrganisations(userId, isDemoUser),
    queryFn: () => {
      if (isDemoUser) {
        // Return mock organisation for demo user
        return [mockOrganisation]
      }
      return userId ? listUserOrganisations(userId) : []
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useOrganisationMembers = (orgId: string | undefined) => {
  const { isDemoUser } = useAuth()

  return useQuery<Member[]>({
    queryKey: organisationKeys.members(orgId, isDemoUser),
    queryFn: () => {
      if (isDemoUser && orgId === DEMO_ORG_ID) {
        return mockOrgMembers.map((m) => ({
          id: m.user_id,
          user_id: m.user_id,
          role: m.role,
          profiles: {
            email: m.email,
            full_name: m.full_name,
          },
        }))
      }
      return orgId ? listOrganisationMembers(orgId) : []
    },
    enabled: !!orgId,
  })
}
