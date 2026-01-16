import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { OrgRow } from '../../components/admin/types'

export const useAdminUsers = () => {
  return useQuery({
    queryKey: ['adminUsers'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('*, super_admin_members(user_id)')
        .order('email', { ascending: true })

      if (error) throw error
      return data
    },
  })
}

export const useAdminOrgs = () => {
  return useQuery({
    queryKey: ['adminOrgs'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('organizations')
        .select('id, name, created_at, owner:profiles!organizations_owner_id_fkey(email, full_name), organization_members(count)')
        .order('created_at', { ascending: false })

      if (error) throw error

      return (data || []).map((o: any) => ({
        id: o.id,
        name: o.name,
        created_at: o.created_at,
        owner: Array.isArray(o.owner) ? o.owner[0] ?? null : o.owner ?? null,
        member_count:
          Array.isArray(o.organization_members) && o.organization_members[0]?.count != null
            ? o.organization_members[0].count
            : null,
      })) as OrgRow[]
    },
  })
}
