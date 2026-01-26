import { useQuery } from '@tanstack/react-query'
import { OrgRow } from '../../components/admin/types'
import { listAdminOrgs, listAdminUsers } from '../../api/organisations'

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: () => listAdminUsers(),
  })
}

export const useAdminOrgs = () => {
  return useQuery({
    queryKey: ['adminOrgs'],
    queryFn: () => listAdminOrgs(),
  })
}
