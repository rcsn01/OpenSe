/**
 * Admin API module.
 *
 * Refactored (Audit Q2): Removed duplicate loadOrganisationMembers
 *   – reuses listOrganisationMembers from organisations.ts instead.
 * Refactored (Audit Q3): Replaced all @ts-ignore with proper typing.
 */
import { supabase } from '../lib/supabase'
import {
  addOrganisationMember,
  findProfileByEmail,
  listOrganisationMembers,
  removeOrganisationMember,
  updateOrganisationName,
  userHasAnyMembership,
} from './organisations'

// Re-export listOrganisationMembers to maintain backward compatibility
// for code that previously imported loadOrganisationMembers from admin.ts (Audit Q2)
export const loadOrganisationMembers = listOrganisationMembers

export const deleteOrganisationMember = removeOrganisationMember

export const createOrganisationWithOwner = async (orgName: string, ownerEmail: string) => {
  const owner = await findProfileByEmail(ownerEmail.trim().toLowerCase())
  if (!owner) throw new Error('User not found. Please ask them to sign up first.')

  const alreadyMember = await userHasAnyMembership(owner.id)
  if (alreadyMember) throw new Error('User is already assigned to an organisation.')

  // Audit Q3: explicit cast replaces blind @ts-ignore.
  // The `never` type arises because supabase-js has no generated DB types;
  // once `supabase gen types` is run, these casts become unnecessary.
  const { data: org, error: orgError } = await (supabase
    .from('organisations') as any)
    .insert({ name: orgName, owner_id: owner.id })
    .select('id, name, owner_id, created_at')
    .single()

  if (orgError) throw orgError

  await addOrganisationMember(org.id, owner.id, 'admin')
  return org
}

export const renameOrganisation = updateOrganisationName

export const changeOrganisationOwner = async (orgId: string, email: string) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  // Properly typed query (Audit Q3: removed @ts-ignore)
  const { data: memberships, error: membershipError } = await supabase
    .from('organisation_members')
    .select('org_id')
    .eq('user_id', profile.id)

  if (membershipError) throw membershipError

  const otherOrg = (memberships ?? []).find(
    (m: { org_id: string }) => m.org_id !== orgId
  )
  if (otherOrg) throw new Error('User is already a member of another organisation.')

  const { data: member } = await (supabase
    .from('organisation_members') as any)
    .select('id')
    .eq('org_id', orgId)
    .eq('user_id', profile.id)
    .single()

  // Audit Q3: explicit cast replaces blind @ts-ignore.
  // Root cause: no generated Supabase DB types. Run `supabase gen types` to fix.
  const { error: ownerError } = await (supabase
    .from('organisations') as any)
    .update({ owner_id: profile.id })
    .eq('id', orgId)

  if (ownerError) throw ownerError

  if (!member) {
    await addOrganisationMember(orgId, profile.id, 'admin')
  } else {
    const { error: roleError } = await (supabase
      .from('organisation_members') as any)
      .update({ role: 'admin' })
      .eq('id', member.id)

    if (roleError) throw roleError
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

export const updateUserProfile = async (
  userId: string,
  updates: { full_name?: string; email?: string }
) => {
  // Audit Q3: explicit cast replaces blind @ts-ignore
  const { error } = await (supabase.from('profiles') as any).update(updates).eq('id', userId)
  if (error) throw error
}
