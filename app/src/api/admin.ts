import { supabase } from '../lib/supabase'
import {
  addOrganizationMember,
  findProfileByEmail,
  removeOrganizationMember,
  updateOrganizationName,
  userHasAnyMembership,
} from './organizations'

export const loadOrganizationMembers = async (orgId: string) => {
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

export const deleteOrganizationMember = removeOrganizationMember

export const createOrganizationWithOwner = async (orgName: string, ownerEmail: string) => {
  const owner = await findProfileByEmail(ownerEmail.trim().toLowerCase())
  if (!owner) throw new Error('User not found. Please ask them to sign up first.')

  const alreadyMember = await userHasAnyMembership(owner.id)
  if (alreadyMember) throw new Error('User is already assigned to an organization.')

  const { data: org, error: orgError } = await supabase
    .from('organizations')
    .insert({ name: orgName, owner_id: owner.id })
    .select()
    .single()

  if (orgError) throw orgError

  await addOrganizationMember(org.id, owner.id, 'admin')
  return org
}

export const renameOrganization = updateOrganizationName

export const changeOrganizationOwner = async (orgId: string, email: string) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  const { data: memberships, error: membershipError } = await supabase
    .from('organization_members')
    .select('org_id')
    .eq('user_id', profile.id)

  if (membershipError) throw membershipError
  const otherOrg = memberships?.find((m) => m.org_id !== orgId)
  if (otherOrg) throw new Error('User is already a member of another organization.')

  const { data: member } = await supabase
    .from('organization_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', profile.id)
    .single()

  await supabase.from('organizations').update({ owner_id: profile.id }).eq('id', orgId)

  if (!member) {
    await addOrganizationMember(orgId, profile.id, 'admin')
  } else {
    await supabase.from('organization_members').update({ role: 'admin' }).eq('id', member.id)
  }
}

export const inviteMemberToOrganization = async (
  orgId: string,
  email: string,
  role: 'admin' | 'member'
) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  const alreadyMember = await userHasAnyMembership(profile.id)
  if (alreadyMember) throw new Error('User is already assigned to an organization.')

  await addOrganizationMember(orgId, profile.id, role)
}

export const deleteOrganization = async (orgId: string) => {
  const { error } = await supabase.from('organizations').delete().eq('id', orgId)
  if (error) throw error
}
