import { supabase } from '@repo/shared/supabase'
import {
  cancelOrganisationInviteForOrg,
  getOrganisationInvitesForOrg,
  inviteOrganisationMember,
  type OrganisationInviteForOrg,
} from '@repo/shared/organisation-invites'
import type { AppCode } from './organisationBilling'

interface OrgContextRow {
  org_id: string
  member_role: SeatMemberRole
}

interface MemberAssignmentRow {
  org_member_id: string
  user_id: string
  full_name: string | null
  email: string | null
  role: SeatMemberRole
  assigned_apps: string[] | null
}

export type SeatMemberRole = 'owner' | 'admin' | 'editor' | 'member'

export interface SeatMember {
  orgMemberId: string
  userId: string
  fullName: string | null
  email: string | null
  role: SeatMemberRole
  assignedApps: AppCode[]
}

export interface PendingSeatInvite {
  id: string
  orgId: string
  email: string
  createdAt: string
  assignedApps: AppCode[]
}

export interface SeatAssignmentSnapshot {
  orgId: string
  currentRole: SeatMemberRole
  members: SeatMember[]
  pendingInvites: PendingSeatInvite[]
}

export const getSeatAssignmentSnapshot = async (): Promise<SeatAssignmentSnapshot> => {
  const { data: contextRows, error: contextError } = await supabase
    .from('account_org_context')
    .select('org_id, member_role')
    .order('member_created_at', { ascending: true })
    .limit(1)
  if (contextError) throw contextError

  const contextRow = Array.isArray(contextRows) ? (contextRows[0] as OrgContextRow | undefined) : undefined
  if (!contextRow) {
    throw new Error('No organisation membership found for the current user.')
  }

  const { data: memberRows, error: memberError } = await supabase
    .from('account_org_member_app_assignments')
    .select('org_member_id, user_id, full_name, email, role, assigned_apps')
    .eq('org_id', contextRow.org_id)
    .order('created_at', { ascending: true })
  if (memberError) throw memberError

  const pendingInviteRows = await getOrganisationInvitesForOrg(contextRow.org_id)

  const normalizedMembers: SeatMember[] = ((memberRows ?? []) as MemberAssignmentRow[]).map((member) => {
    const assignedApps = (member.assigned_apps ?? []).filter(
      (appCode: string): appCode is AppCode => appCode === 'etl' || appCode === 'stoqr',
    )

    return {
      orgMemberId: member.org_member_id,
      userId: member.user_id,
      role: member.role,
      fullName: member.full_name,
      email: member.email,
      assignedApps,
    }
  })

  return {
    orgId: contextRow.org_id,
    currentRole: contextRow.member_role,
    members: normalizedMembers,
    pendingInvites: pendingInviteRows.map((invite: OrganisationInviteForOrg) => ({
      id: invite.id,
      orgId: invite.org_id,
      email: invite.email,
      createdAt: invite.created_at,
      assignedApps: (invite.assigned_apps ?? []).filter(
        (appCode: string): appCode is AppCode => appCode === 'etl' || appCode === 'stoqr',
      ),
    })),
  }
}

export const inviteSeatMembers = async (
  orgId: string,
  emails: string[],
  assignedApps: AppCode[] = [],
): Promise<void> => {
  const normalizedEmails = Array.from(
    new Set(
      emails
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  )

  for (const email of normalizedEmails) {
    const invite = await inviteOrganisationMember(orgId, email, 'member')
    for (const appCode of assignedApps) {
      await assignInviteSeat(invite.id, appCode)
    }
  }
}

export const cancelSeatInvite = async (orgId: string, inviteId: string): Promise<void> => {
  await cancelOrganisationInviteForOrg(orgId, inviteId)
}

export const assignSeat = async (orgMemberId: string, appCode: AppCode): Promise<void> => {
  const { error } = await supabase.rpc('accounts_assign_org_member_app_seat', {
    p_org_member_id: orgMemberId,
    p_app_code: appCode,
  })

  if (error) throw error
}

export const unassignSeat = async (orgMemberId: string, appCode: AppCode): Promise<void> => {
  const { error } = await supabase.rpc('accounts_unassign_org_member_app_seat', {
    p_org_member_id: orgMemberId,
    p_app_code: appCode,
  })

  if (error) throw error
}

export const assignInviteSeat = async (inviteId: string, appCode: AppCode): Promise<void> => {
  const { error } = await supabase.rpc('accounts_assign_org_invite_app_seat', {
    p_invite_id: inviteId,
    p_app_code: appCode,
  })

  if (error) throw error
}

export const unassignInviteSeat = async (inviteId: string, appCode: AppCode): Promise<void> => {
  const { error } = await supabase.rpc('accounts_unassign_org_invite_app_seat', {
    p_invite_id: inviteId,
    p_app_code: appCode,
  })

  if (error) throw error
}
