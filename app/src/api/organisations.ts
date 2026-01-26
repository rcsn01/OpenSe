import { supabase } from '../lib/supabase'
import { OrgRow } from '../components/admin/types'
import { OrgSimple } from '../types/organisation'

export const updateOrganisationName = async (orgId: string, name: string) => {
  const { error } = await supabase.from('organisations').update({ name }).eq('id', orgId)
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
  const { data, error } = await supabase.from('organisation_members').select('id').eq('user_id', userId).limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

export const addOrganisationMember = async (
  orgId: string,
  userId: string,
  role: 'admin' | 'editor' | 'member'
) => {
  const { error } = await supabase.from('organisation_members').insert({ org_id: orgId, user_id: userId, role })
  if (error) throw error
}

export const removeOrganisationMember = async (memberId: string) => {
  const { error } = await supabase.from('organisation_members').delete().eq('id', memberId)
  if (error) throw error
}

export const listUserOrganisations = async (userId: string) => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('organisations(id, name, owner_id, created_at)')
    .eq('user_id', userId)

  if (error) throw error

  return (
    data
      ?.map((item: any) => (Array.isArray(item.organisations) ? item.organisations[0] : item.organisations))
      .filter((o) => !!o) ?? []
  ) as OrgSimple[]
}

export const listOrganisationMembers = async (orgId: string) => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('id, role, user_id, profiles:profiles!organisation_members_user_id_fkey(email, full_name)')
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
    .from('organisations')
    .select('id, name, created_at, owner:profiles!organisations_owner_id_fkey(email, full_name), organisation_members(count)')
    .order('created_at', { ascending: false })

  if (error) throw error

  return (data || []).map((o: any) => ({
    id: o.id,
    name: o.name,
    created_at: o.created_at,
    owner: Array.isArray(o.owner) ? o.owner[0] ?? null : o.owner ?? null,
    member_count:
      Array.isArray(o.organisation_members) && o.organisation_members[0]?.count != null
        ? o.organisation_members[0].count
        : null,
  })) as OrgRow[]
}
