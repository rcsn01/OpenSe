import { supabase } from '../lib/supabase'
import { OrgRow } from '../components/admin/types'
import { OrgSimple } from '../types/organization'

export const updateOrganizationName = async (orgId: string, name: string) => {
  const { error } = await supabase.from('organizations').update({ name }).eq('id', orgId)
  if (error) throw error
}

export const findProfileByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

export const userHasAnyMembership = async (userId: string) => {
  const { data, error } = await supabase.from('organization_members').select('id').eq('user_id', userId).limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export const addOrganizationMember = async (orgId: string, userId: string, role: 'admin' | 'member') => {
  const { error } = await supabase.from('organization_members').insert({ org_id: orgId, user_id: userId, role })
  if (error) throw error
}

export const removeOrganizationMember = async (memberId: string) => {
  const { error } = await supabase.from('organization_members').delete().eq('id', memberId)
  if (error) throw error
}

export const listUserOrganizations = async (userId: string) => {
  const { data, error } = await supabase
    .from('organization_members')
    .select('organizations(id, name, owner_id, created_at)')
    .eq('user_id', userId)

  if (error) throw error

  return (
    data
      ?.map((item: any) => (Array.isArray(item.organizations) ? item.organizations[0] : item.organizations))
      .filter((o) => !!o) ?? []
  ) as OrgSimple[]
}

export const listOrganizationMembers = async (orgId: string) => {
  const { data, error } = await supabase
    .from('organization_members')
    .select('id, role, user_id, profiles:profiles!organization_members_user_id_fkey(email, full_name)')
    .eq('org_id', orgId)

  if (error) throw error

  return (
    data?.map((m) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
    })) ?? []
  )
}

export const listAdminUsers = async () => {
  const { data, error } = await supabase.from('profiles').select('*, super_admin_members(user_id)').order('email', {
    ascending: true,
  })

  if (error) throw error
  return data
}

export const listAdminOrgs = async () => {
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
}
