import { supabase } from '../lib/supabase'
import { OrgRow } from '../components/admin/types'
import { OrgSimple, OrgInvite } from '../types/organisation'

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

export const createOrganisation = async (name: string, tier: 'tier-1' | 'tier-2' | 'tier-3') => {
  const { data: user } = await supabase.auth.getUser()
  if (!user.user) throw new Error('Not authenticated')

  // In a real app, this would be a single RPC or transaction that:
  // 1. Creates the organisation with the selected tier
  // 2. Adds the creator as the owner
  // 3. Sets up stripe subscription

  // For now, we'll just insert into organisations
  const { data, error } = await supabase
    .from('organisations')
    .insert({ name, owner_id: user.user.id })
    .select('id')
    .single()

  if (error) throw error

  // And add the member
  if (data) {
    await addOrganisationMember(data.id, user.user.id, 'admin')
  }

  return data
}

// Mocked Invites
export const getPendingInvites = async (): Promise<OrgInvite[]> => {
  // Simulate network delay
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Mock data - in real app would query 'organisation_invites' table
  return [
    {
      id: 'inv-1',
      org_name: 'Acme Corp',
      org_id: 'org-123',
      inviter_name: 'John Doe',
      role: 'editor',
      created_at: new Date().toISOString(),
    },
    {
      id: 'inv-2',
      org_name: 'Stark Industries',
      org_id: 'org-456',
      inviter_name: 'Tony Stark',
      role: 'member',
      created_at: new Date(Date.now() - 86400000).toISOString(),
    }
  ]
}

export const acceptInvite = async (inviteId: string) => {
  // In real app: call RPC to accept invite
  await new Promise((resolve) => setTimeout(resolve, 800))
  // We can't really "accept" the mock invite into the real DB without a real invite system
  // So we'll just return success 
  return true
}

export const rejectInvite = async (inviteId: string) => {
  await new Promise((resolve) => setTimeout(resolve, 500))
  return true
}

export const updateOrganisationTier = async (orgId: string, tier: 'tier-1' | 'tier-2' | 'tier-3') => {
  // Mock API call to update tier and seat limit
  // In real app, this would call Stripe and update DB
  await new Promise((resolve) => setTimeout(resolve, 1000))
  return true
}
