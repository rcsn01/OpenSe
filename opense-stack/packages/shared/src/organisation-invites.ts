import { supabase } from './supabase'

export type OrganisationInviteRole = 'admin' | 'editor' | 'member'

interface OrganisationInviteRow {
  id: string
  org_id: string
  role: OrganisationInviteRole
  created_at: string
  organisations: { name: string } | { name: string }[] | null
  inviter: { full_name: string | null; email: string | null } | { full_name: string | null; email: string | null }[] | null
}

export interface PendingOrganisationInvite {
  id: string
  org_id: string
  org_name: string
  inviter_name: string
  role: OrganisationInviteRole
  created_at: string
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const getCurrentUserEmail = async (): Promise<string> => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error

  const email = data.user?.email?.trim().toLowerCase()
  if (!email) {
    throw new Error('Authenticated user email is required to manage organisation invites.')
  }

  return email
}

export const getPendingOrganisationInvites = async (): Promise<PendingOrganisationInvite[]> => {
  const email = await getCurrentUserEmail()

  const { data, error } = await supabase
    .schema('etl')
    .from('organisation_invites')
    .select('id, org_id, role, created_at, organisations:organisations!organisation_invites_org_id_fkey(name), inviter:profiles!organisation_invites_invited_by_fkey(full_name, email)')
    .eq('email', email)
    .order('created_at', { ascending: true })

  if (error) throw error

  return ((data ?? []) as OrganisationInviteRow[]).map((invite) => {
    const organisation = normalizeSingle(invite.organisations)
    const inviter = normalizeSingle(invite.inviter)

    return {
      id: invite.id,
      org_id: invite.org_id,
      org_name: organisation?.name ?? 'Organisation',
      inviter_name: inviter?.full_name ?? inviter?.email ?? 'Unknown',
      role: invite.role,
      created_at: invite.created_at,
    }
  })
}

export const acceptOrganisationInvite = async (inviteId: string): Promise<void> => {
  const { error } = await supabase.rpc('accept_invite', { invite_id: inviteId })
  if (error) throw error
}

export const declineOrganisationInvite = async (inviteId: string): Promise<void> => {
  const email = await getCurrentUserEmail()

  const { error } = await supabase
    .schema('etl')
    .from('organisation_invites')
    .delete()
    .eq('id', inviteId)
    .eq('email', email)

  if (error) throw error
}

export const inviteOrganisationMember = async (
  orgId: string,
  email: string,
  role: OrganisationInviteRole,
): Promise<void> => {
  const normalizedEmail = email.trim().toLowerCase()
  if (!normalizedEmail) {
    throw new Error('Invite email is required.')
  }

  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { error } = await supabase
    .schema('etl')
    .from('organisation_invites')
    .upsert(
      {
        org_id: orgId,
        email: normalizedEmail,
        role,
        invited_by: data.user?.id ?? null,
      },
      { onConflict: 'org_id,email', ignoreDuplicates: false },
    )

  if (error) throw error
}
