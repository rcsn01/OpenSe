import { useQuery } from '@tanstack/react-query'
import { fetchMyPermissions } from '../../api/permissions'

export const useMyPermissions = (organisationId: string | null) =>
  useQuery({
    queryKey: ['open-kb', 'permissions', organisationId],
    queryFn: () => fetchMyPermissions(organisationId ?? ''),
    enabled: Boolean(organisationId),
    staleTime: 60_000,
  })
