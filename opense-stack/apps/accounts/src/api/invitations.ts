/**
 * Organisation invitation API (organisation-level, usable from accounts app).
 * Invites live in etl.organisation_invites but are org-level, not app-specific.
 */
import { supabase } from '@repo/shared/supabase'

export interface OrgInvite {
  id: string
  org_id: string
  org_name: string
  role: 'admin' | 'editor' | 'member'
  created_at: string
  inviter_name: string
}

const db = supabase.schema('etl')

export const getPendingInvites = async (): Promise<OrgInvite[]> => {
  const { data: session } = await supabase.auth.getSession()
  const userEmail = session.session?.user?.email

  if (!userEmail) return []

  const { data, error } = await db
    .from('organisation_invites')
    .select(
      `
        id,
        role,
        created_at,
        organisations (id, name),
        inviter:profiles!organisation_invites_invited_by_fkey (full_name)
      `
    )
    .eq('email', userEmail)

  if (error) throw error

  return (data ?? []).map((i: Record<string, unknown>) => {
    const orgs = i.organisations as { id?: string; name?: string } | null
    const inviter = i.inviter as { full_name?: string } | null
    return {
      id: i.id as string,
      org_id: orgs?.id ?? '',
      org_name: orgs?.name ?? 'Unknown',
      role: i.role as OrgInvite['role'],
      created_at: i.created_at as string,
      inviter_name: inviter?.full_name ?? 'Unknown',
    }
  })
}

export const acceptInvite = async (inviteId: string): Promise<void> => {
  const { error } = await supabase.rpc('accept_invite', { invite_id: inviteId })
  if (error) throw error
}

export const rejectInvite = async (inviteId: string): Promise<void> => {
  const { error } = await db.from('organisation_invites').delete().eq('id', inviteId)
  if (error) throw error
}

export const inviteMember = async (
  orgId: string,
  email: string,
  role: 'admin' | 'editor' | 'member'
): Promise<void> => {
  const { data: user } = await supabase.auth.getUser()
  const { error } = await db.from('organisation_invites').insert({
    org_id: orgId,
    email: email.trim().toLowerCase(),
    role,
    invited_by: user.user?.id,
  })
  if (error) throw error
}
