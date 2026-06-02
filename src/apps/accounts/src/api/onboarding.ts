import { supabase } from '@repo/shared/supabase'
import {
  acceptOrganisationInvite as acceptSharedOrganisationInvite,
  declineOrganisationInvite as declineSharedOrganisationInvite,
  getPendingOrganisationInvites as getSharedPendingOrganisationInvites,
  inviteOrganisationMember,
} from '@repo/shared/organisation-invites'

export type AppCode = 'etl' | 'stoqr'
export type MemberRole = 'owner' | 'admin' | 'editor' | 'member'
export type InviteRole = 'admin' | 'editor' | 'member'
export type OnboardingStep = 'invites' | 'create' | 'invite-members' | 'blocked' | 'done'

export interface PendingInvite {
  id: string
  orgId: string
  orgName: string
  inviterName: string
  role: InviteRole
  createdAt: string
}

export interface OnboardingStatus {
  needsOnboarding: boolean
  step: OnboardingStep
  pendingInvites: PendingInvite[]
  orgId: string | null
  orgName: string | null
  role: MemberRole | null
}

interface MembershipRow {
  org_id: string
  role: MemberRole
  organisations: { name: string } | { name: string }[] | null
}

const appCodes: AppCode[] = ['etl', 'stoqr']

export interface OnboardingInstancePolicy {
  canCreateOrganisation: boolean
  organisationCount: number
  maxOrganisations: number
  freeSeatLimit: number | null
}

interface OnboardingInstancePolicyRow {
  can_create_organisation: boolean
  organisation_count: number
  max_organisations: number
  free_seat_limit: number | null
}

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const getCurrentUser = async () => {
  const { data, error } = await supabase.auth.getUser()
  if (error) throw error
  if (!data.user) throw new Error('Not authenticated')
  return data.user
}

const updateOnboardingMetadata = async (updates: Record<string, unknown>) => {
  const user = await getCurrentUser()
  const existing = (user.user_metadata ?? {}) as Record<string, unknown>
  const { error } = await supabase.auth.updateUser({ data: { ...existing, ...updates } })
  if (error) throw error
}

const getPrimaryMembership = async (userId: string): Promise<{ orgId: string; orgName: string; role: MemberRole } | null> => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('org_id, role, organisations(name)')
    .eq('user_id', userId)
    .order('created_at', { ascending: true })
    .limit(1)

  if (error) throw error

  const row = (data?.[0] as MembershipRow | undefined) ?? null
  if (!row) return null

  const org = normalizeSingle(row.organisations)
  return {
    orgId: row.org_id,
    role: row.role,
    orgName: org?.name ?? 'Organisation',
  }
}

export const getPendingOrganisationInvites = async (): Promise<PendingInvite[]> => {
  const pendingInvites = await getSharedPendingOrganisationInvites()

  return pendingInvites.map((invite) => {
    return {
      id: invite.id,
      orgId: invite.org_id,
      orgName: invite.org_name,
      inviterName: invite.inviter_name,
      role: invite.role,
      createdAt: invite.created_at,
    }
  })
}

export const getOnboardingInstancePolicy = async (): Promise<OnboardingInstancePolicy> => {
  const { data, error } = await supabase.rpc('accounts_get_onboarding_instance_policy')
  if (error) throw error

  const row = Array.isArray(data) ? (data[0] as OnboardingInstancePolicyRow | undefined) : undefined
  if (!row) {
    throw new Error('Onboarding policy was not returned.')
  }

  return {
    canCreateOrganisation: row.can_create_organisation,
    organisationCount: row.organisation_count,
    maxOrganisations: row.max_organisations,
    freeSeatLimit: row.free_seat_limit,
  }
}

export const acceptOrganisationInvite = async (inviteId: string): Promise<void> => {
  await acceptSharedOrganisationInvite(inviteId)
}

export const startInviteMembersOnboarding = async (): Promise<void> => {
  await updateOnboardingMetadata({
    accounts_onboarding_completed: false,
    accounts_onboarding_stage: 'invite-members',
  })
}

export const declineOrganisationInvite = async (inviteId: string): Promise<void> => {
  await declineSharedOrganisationInvite(inviteId)
}

export const getOnboardingStatus = async (): Promise<OnboardingStatus> => {
  const user = await getCurrentUser()
  const membership = await getPrimaryMembership(user.id)

  if (membership) {
    const metadata = (user.user_metadata ?? {}) as Record<string, unknown>
    const hasCompletionFlag = Object.prototype.hasOwnProperty.call(metadata, 'accounts_onboarding_completed')
    const completed = metadata.accounts_onboarding_completed === true || !hasCompletionFlag

    if (completed) {
      return {
        needsOnboarding: false,
        step: 'done',
        pendingInvites: [],
        orgId: membership.orgId,
        orgName: membership.orgName,
        role: membership.role,
      }
    }

    return {
      needsOnboarding: true,
      step: 'invite-members',
      pendingInvites: [],
      orgId: membership.orgId,
      orgName: membership.orgName,
      role: membership.role,
    }
  }

  const pendingInvites = await getPendingOrganisationInvites()
  if (pendingInvites.length > 0) {
    return {
      needsOnboarding: true,
      step: 'invites',
      pendingInvites,
      orgId: null,
      orgName: null,
      role: null,
    }
  }

  const policy = await getOnboardingInstancePolicy()

  return {
    needsOnboarding: true,
    step: policy.canCreateOrganisation ? 'create' : 'blocked',
    pendingInvites,
    orgId: null,
    orgName: null,
    role: null,
  }
}

export const createOrganisationForOnboarding = async (input: {
  name: string
  selectedApps: AppCode[]
  freeSeatLimit: number | null
}): Promise<{ orgId: string; orgName: string }> => {
  const user = await getCurrentUser()
  const orgName = input.name.trim()

  if (!orgName) {
    throw new Error('Organisation name is required.')
  }

  const selectedApps = Array.from(new Set(input.selectedApps))
  const invalidApp = selectedApps.find((appCode) => !appCodes.includes(appCode))
  if (invalidApp) {
    throw new Error(`Unsupported app code: ${invalidApp}`)
  }

  const { data: existingMembership, error: existingMembershipError } = await supabase
    .from('organisation_members')
    .select('id')
    .eq('user_id', user.id)
    .limit(1)

  if (existingMembershipError) throw existingMembershipError
  if ((existingMembership?.length ?? 0) > 0) {
    throw new Error('User already belongs to an organisation')
  }

  const { data, error } = await supabase
    .from('organisations')
    .insert({
      name: orgName,
      owner_id: user.id,
    })
    .select('id, name')
    .single()

  if (error) throw error

  const row = data as { id: string; name: string } | null
  if (!row?.id) {
    throw new Error('Organisation creation did not return a row.')
  }

  for (const appCode of appCodes) {
    const { error: seatError } = await supabase
      .from('organisation_app_seats')
      .update({ seat_limit: selectedApps.includes(appCode) ? input.freeSeatLimit : 0 })
      .eq('org_id', row.id)
      .eq('app_code', appCode)

    if (seatError) throw seatError
  }

  const currentEmail = user.email?.trim().toLowerCase()
  if (currentEmail) {
    const { error: cleanupError } = await supabase
      .from('organisation_invites')
      .delete()
      .eq('email', currentEmail)

    if (cleanupError) throw cleanupError
  }

  await updateOnboardingMetadata({
    accounts_onboarding_completed: false,
    accounts_onboarding_stage: 'invite-members',
  })

  return {
    orgId: row.id,
    orgName: row.name,
  }
}

export const inviteOrganisationMembers = async (orgId: string, emails: string[]): Promise<void> => {
  const normalizedEmails = Array.from(
    new Set(
      emails
        .map((value) => value.trim().toLowerCase())
        .filter((value) => value.length > 0),
    ),
  )

  if (normalizedEmails.length === 0) {
    return
  }

  for (const email of normalizedEmails) {
    await inviteOrganisationMember(orgId, email, 'member')
  }
}

export const completeOrganisationOnboarding = async (): Promise<void> => {
  await updateOnboardingMetadata({
    accounts_onboarding_completed: true,
    accounts_onboarding_stage: 'done',
  })
}
