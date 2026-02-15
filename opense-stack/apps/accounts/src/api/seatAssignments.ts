import { supabase } from '@repo/shared/supabase'
import type { AppCode } from './organisationBilling'

interface OrgContextRow {
  org_id: string
}

interface MemberAssignmentRow {
  org_member_id: string
  user_id: string
  full_name: string | null
  email: string | null
  role: 'owner' | 'admin' | 'editor' | 'member'
  assigned_apps: string[] | null
}

export interface SeatMember {
  orgMemberId: string
  userId: string
  fullName: string | null
  email: string | null
  role: 'owner' | 'admin' | 'editor' | 'member'
  assignedApps: AppCode[]
}

export interface SeatAssignmentSnapshot {
  orgId: string
  members: SeatMember[]
}

export const getSeatAssignmentSnapshot = async (): Promise<SeatAssignmentSnapshot> => {
  const { data: contextRows, error: contextError } = await supabase.rpc('accounts_get_my_org_context')
  if (contextError) throw contextError

  const contextRow = Array.isArray(contextRows) ? (contextRows[0] as OrgContextRow | undefined) : undefined
  if (!contextRow) {
    throw new Error('No organisation membership found for the current user.')
  }

  const { data: memberRows, error: memberError } = await supabase.rpc('accounts_get_org_member_app_assignments')
  if (memberError) throw memberError

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
    members: normalizedMembers,
  }
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
