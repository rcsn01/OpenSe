import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchOrganisationPageSettings,
  type OrganisationPageSettings,
  updateOrganisationPageSettings,
} from '../../api/organisationPageSettings'

const organisationPageSettingsKey = (companyId: string | null) =>
  ['stoqr', 'organisation-page-settings', companyId] as const

export const useOrganisationPageSettings = (companyId: string | null) =>
  useQuery({
    queryKey: organisationPageSettingsKey(companyId),
    queryFn: () => fetchOrganisationPageSettings(companyId as string),
    enabled: !!companyId,
  })

export const useUpdateOrganisationPageSettings = (companyId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (settings: OrganisationPageSettings) => {
      if (!companyId) throw new Error('No company selected')
      return updateOrganisationPageSettings(companyId, settings)
    },
    onSuccess: (settings) => {
      queryClient.setQueryData(organisationPageSettingsKey(companyId), settings)
      void queryClient.invalidateQueries({
        queryKey: organisationPageSettingsKey(companyId),
      })
    },
  })
}