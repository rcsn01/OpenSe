import { supabase } from '../lib/supabase'
import {
  addOrganisationMember,
  findProfileByEmail,
  removeOrganisationMember,
  updateOrganisationName,
  userHasAnyMembership,
} from './organisations'

export const loadOrganisationMembers = async (orgId: string) => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('id, role, user_id, profiles:profiles!organisation_members_user_id_fkey(email, full_name)')
    .eq('org_id', orgId)

  if (error) throw error

  return (
    data?.map((m: any) => ({
      ...m,
      profiles: Array.isArray(m.profiles) ? m.profiles[0] ?? null : m.profiles ?? null,
    })) ?? []
  )
}

export const deleteOrganisationMember = removeOrganisationMember

export const createOrganisationWithOwner = async (orgName: string, ownerEmail: string) => {
  const owner = await findProfileByEmail(ownerEmail.trim().toLowerCase())
  if (!owner) throw new Error('User not found. Please ask them to sign up first.')

  const alreadyMember = await userHasAnyMembership(owner.id)
  if (alreadyMember) throw new Error('User is already assigned to an organisation.')

  // @ts-ignore
  const { data: org, error: orgError } = await supabase
    .from('organisations')
    .insert({ name: orgName, owner_id: owner.id })
    .select()
    .single()

  if (orgError) throw orgError

  await addOrganisationMember(org.id, owner.id, 'admin')
  return org
}

export const renameOrganisation = updateOrganisationName

export const changeOrganisationOwner = async (orgId: string, email: string) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  const { data: memberships, error: membershipError } = await supabase
    .from('organisation_members')
    .select('org_id')
    .eq('user_id', profile.id)

  if (membershipError) throw membershipError
  // @ts-ignore
  const otherOrg = memberships?.find((m) => m.org_id !== orgId)
  if (otherOrg) throw new Error('User is already a member of another organisation.')

  const { data: member } = await supabase
    .from('organisation_members')
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', profile.id)
    .single()

  // @ts-ignore
  await supabase.from('organisations').update({ owner_id: profile.id }).eq('id', orgId)

  if (!member) {
    await addOrganisationMember(orgId, profile.id, 'admin')
  } else {
    // @ts-ignore
    await supabase.from('organisation_members').update({ role: 'admin' }).eq('id', member.id)
  }
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
  const { error } = await supabase.from('organisations').delete().eq('id', orgId)
  if (error) throw error
}

export const updateUserProfile = async (userId: string, updates: { full_name?: string; email?: string }) => {
  // @ts-ignore
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}
