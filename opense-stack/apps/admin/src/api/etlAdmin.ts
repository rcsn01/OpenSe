import { supabase } from '@repo/shared/supabase'

const db = supabase.schema('etl')

export type OrgRow = {
  id: string
  name: string
  created_at: string | null
  owner?: { email: string | null; full_name: string | null } | null
  member_count?: number | null
  tier?: 'tier-1' | 'tier-2' | 'tier-3' | null
  subscription_status?: string | null
}

export type UserOrgMembership = {
  org_id: string
  org_name: string
  role: 'admin' | 'editor' | 'member'
}

export type AdminUserRow = {
  id: string
  email: string | null
  full_name: string | null
  created_at?: string
  super_admin_members?: { user_id: string }[]
  memberships?: UserOrgMembership[]
}

export type MemberRow = {
  id: string
  user_id: string
  role: 'admin' | 'editor' | 'member'
  profiles?: {
    email: string | null
    full_name: string | null
  } | null
}

type AdminOrgQueryRow = {
  id: string
  name: string
  created_at: string | null
  tier: 'tier-1' | 'tier-2' | 'tier-3' | null
  subscription_status: string | null
  owner: { email: string | null; full_name: string | null } | Array<{ email: string | null; full_name: string | null }> | null
  organisation_members: Array<{ count: number }> | null
}

type MembershipRow = {
  user_id: string
  role: 'admin' | 'editor' | 'member'
  org_id: string
  organisations: { name: string } | Array<{ name: string }> | null
}

type AdminProfileRow = {
  id: string
  email: string | null
  full_name: string | null
  created_at?: string
  super_admin_members?: { user_id: string }[]
}

type OrgMemberQueryRow = {
  id: string
  role: 'admin' | 'editor' | 'member'
  user_id: string
  profiles: { email: string | null; full_name: string | null } | Array<{ email: string | null; full_name: string | null }> | null
}

export const listAdminOrgs = async (): Promise<OrgRow[]> => {
  const { data, error } = await db
    .from('organisations')
    .select('id, name, created_at, tier, subscription_status, owner:profiles!organisations_owner_id_fkey(email, full_name), organisation_members(count)')
    .order('created_at', { ascending: false })

  if (error) throw error

  const rows = (data || []) as AdminOrgQueryRow[]

  return rows.map((org) => ({
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    tier: org.tier ?? null,
    subscription_status: org.subscription_status ?? null,
    owner: Array.isArray(org.owner) ? org.owner[0] ?? null : org.owner ?? null,
    member_count:
      Array.isArray(org.organisation_members) && org.organisation_members[0]?.count != null
        ? org.organisation_members[0].count
        : null,
  })) as OrgRow[]
}

export const listAdminUsers = async (): Promise<AdminUserRow[]> => {
  const { data: profilesData, error: profilesError } = await supabase
    .from('profiles')
    .select('*, super_admin_members(user_id)')
    .order('email', { ascending: true })

  if (profilesError) throw profilesError

  const { data: membershipsData, error: membershipsError } = await db
    .from('organisation_members')
    .select('user_id, role, org_id, organisations(name)')

  if (membershipsError) throw membershipsError

  const membershipsByUser = new Map<string, UserOrgMembership[]>()

  const membershipRows = (membershipsData || []) as MembershipRow[]
  for (const membership of membershipRows) {
    const relation = Array.isArray(membership.organisations)
      ? membership.organisations[0] ?? null
      : membership.organisations
    const orgName = relation?.name || 'Unknown'
    const normalized: UserOrgMembership = {
      org_id: membership.org_id,
      org_name: orgName,
      role: membership.role as 'admin' | 'editor' | 'member',
    }

    if (!membershipsByUser.has(membership.user_id)) {
      membershipsByUser.set(membership.user_id, [])
    }

    membershipsByUser.get(membership.user_id)?.push(normalized)
  }

  const profileRows = (profilesData || []) as AdminProfileRow[]

  return profileRows.map((profile) => ({
    ...profile,
    memberships: membershipsByUser.get(profile.id) || [],
  })) as AdminUserRow[]
}

export const listOrganisationMembers = async (orgId: string): Promise<MemberRow[]> => {
  const { data, error } = await db
    .from('organisation_members')
    .select('id, role, user_id, profiles:profiles!organisation_members_user_id_fkey(email, full_name)')
    .eq('org_id', orgId)

  if (error) throw error

  const rows = (data || []) as OrgMemberQueryRow[]

  return rows.map((member) => ({
    ...member,
    profiles: Array.isArray(member.profiles) ? member.profiles[0] ?? null : member.profiles ?? null,
  })) as MemberRow[]
}

const findProfileByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

const userHasAnyMembership = async (userId: string) => {
  const { data, error } = await db.from('organisation_members').select('id').eq('user_id', userId).limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

const addOrganisationMember = async (orgId: string, userId: string, role: 'admin' | 'editor' | 'member') => {
  const { error } = await db.from('organisation_members').insert({ org_id: orgId, user_id: userId, role })
  if (error) throw error
}

export const createOrganisationWithOwner = async (orgName: string, ownerEmail: string) => {
  const owner = await findProfileByEmail(ownerEmail.trim().toLowerCase())
  if (!owner) throw new Error('User not found. Ask them to sign up first.')

  const alreadyMember = await userHasAnyMembership(owner.id)
  if (alreadyMember) throw new Error('User is already assigned to an organisation.')

  const { data: org, error: orgError } = await db
    .from('organisations')
    .insert({ name: orgName, owner_id: owner.id })
    .select('id, name, owner_id, created_at')
    .single()

  if (orgError) throw orgError

  await addOrganisationMember(org.id, owner.id, 'admin')
  return org
}

export const renameOrganisation = async (orgId: string, name: string) => {
  const { error } = await db.from('organisations').update({ name }).eq('id', orgId)
  if (error) throw error
}

export const changeOrganisationOwner = async (orgId: string, email: string) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  const { data: memberships, error: membershipError } = await db
    .from('organisation_members')
    .select('org_id')
    .eq('user_id', profile.id)

  if (membershipError) throw membershipError

  const otherOrg = (memberships ?? []).find((item: { org_id: string }) => item.org_id !== orgId)
  if (otherOrg) throw new Error('User is already a member of another organisation.')

  const { data: member } = await db
    .from('organisation_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', profile.id)
    .single()

  const { error: ownerError } = await db.from('organisations').update({ owner_id: profile.id }).eq('id', orgId)
  if (ownerError) throw ownerError

  if (!member) {
    await addOrganisationMember(orgId, profile.id, 'admin')
    return
  }

  const { error: roleError } = await db
    .from('organisation_members')
    .update({ role: 'admin' })
    .eq('id', member.id)

  if (roleError) throw roleError
}

export const inviteMemberToOrganisation = async (
  orgId: string,
  email: string,
  role: 'admin' | 'editor' | 'member'
) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  const alreadyMember = await userHasAnyMembership(profile.id)
  if (alreadyMember) throw new Error('User is already assigned to an organisation.')

  await addOrganisationMember(orgId, profile.id, role)
}

export const deleteOrganisation = async (orgId: string) => {
  const { error } = await db.from('organisations').delete().eq('id', orgId)
  if (error) throw error
}

export const deleteOrganisationMember = async (memberId: string) => {
  const { error } = await db.from('organisation_members').delete().eq('id', memberId)
  if (error) throw error
}

export const updateUserProfile = async (userId: string, updates: { full_name?: string; email?: string }) => {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

const callUserAdminAction = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('admin-user-management', { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export const createAdminUser = async (email: string, password: string, fullName: string) =>
  callUserAdminAction({ action: 'create', email, password, fullName })

export const resetAdminUserPassword = async (targetUserId: string, newPassword: string) =>
  callUserAdminAction({ action: 'reset-password', targetUserId, newPassword })

export const deleteAdminUser = async (targetUserId: string) =>
  callUserAdminAction({ action: 'delete', targetUserId })
