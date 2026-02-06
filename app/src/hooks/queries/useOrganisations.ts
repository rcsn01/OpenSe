import { useQuery } from '@tanstack/react-query'
import { listOrganisationMembers, listUserOrganisations } from '../../api/organisations'
import { OrgSimple } from '../../types/organisation'
import { useAuth } from '../../context/AuthContext'
import { mockOrganisation, mockOrgMembers, DEMO_ORG_ID } from '../../lib/demoData'

export type { OrgSimple }

export const useUserOrganisations = (userId: string | undefined) => {
  const { isDemoUser } = useAuth()

  return useQuery({
    queryKey: ['userOrganisations', userId, isDemoUser],
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

  return useQuery({
    queryKey: ['organisationMembers', orgId, isDemoUser],
    queryFn: () => {
      if (isDemoUser && orgId === DEMO_ORG_ID) {
        // Return mock members for demo org
        return mockOrgMembers
      }
      return orgId ? listOrganisationMembers(orgId) : []
    },
    enabled: !!orgId,
  })
}
