import { useQuery } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'

export type OrgSimple = { id: string; name: string; owner_id?: string; created_at?: string }

export const useUserOrganizations = (userId: string | undefined) => {
  return useQuery({
    queryKey: ['userOrganizations', userId],
    queryFn: async () => {
      if (!userId) return []
      const { data, error } = await supabase
        .from('organization_members')
        .select('organizations(id, name, owner_id, created_at)')
        .eq('user_id', userId)

      if (error) throw error

      return data
        .map((item: any) => (Array.isArray(item.organizations) ? item.organizations[0] : item.organizations))
        .filter((o) => !!o) as OrgSimple[]
    },
    enabled: !!userId,
    staleTime: 1000 * 60 * 5,
  })
}

export const useOrganizationMembers = (orgId: string | undefined) => {
  return useQuery({
    queryKey: ['organizationMembers', orgId],
    queryFn: async () => {
      if (!orgId) return []
      const { data, error } = await supabase
        .from('organization_members')
        .select('id, role, user_id, profiles:profiles!organization_members_user_id_fkey(email, full_name)')
        .eq('org_id', orgId)

      if (error) throw error

      return data.map((m) => ({
        ...m,
        profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
      }))
    },
    enabled: !!orgId,
  })
}
