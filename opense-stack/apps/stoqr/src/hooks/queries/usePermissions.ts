import { useQuery } from '@tanstack/react-query'
import { fetchMyPermissions } from '../../api/permissions'

export const myPermissionsKey = (companyId: string | null) => ['stoqr', 'my-permissions', companyId] as const

export const useMyPermissions = (companyId: string | null) =>
  useQuery({
    queryKey: myPermissionsKey(companyId),
    queryFn: () => fetchMyPermissions(companyId as string),
    enabled: !!companyId,
    staleTime: 30_000,
  })
