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
export type OnboardingStep = 'invites' | 'create' | 'invite-members' | 'done'

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

  return {
    needsOnboarding: true,
    step: pendingInvites.length > 0 ? 'invites' : 'create',
    pendingInvites,
    orgId: null,
    orgName: null,
    role: null,
  }
}

export const createOrganisationForOnboarding = async (input: {
  name: string
  selectedApps: AppCode[]
}): Promise<{ orgId: string; orgName: string }> => {
  await getCurrentUser()
  const orgName = input.name.trim()

  if (!orgName) {
    throw new Error('Organisation name is required.')
  }

  const selectedApps = Array.from(new Set(input.selectedApps))
  const invalidApp = selectedApps.find((appCode) => !appCodes.includes(appCode))
  if (invalidApp) {
    throw new Error(`Unsupported app code: ${invalidApp}`)
  }

  const { data, error } = await supabase.rpc('accounts_create_organisation', {
    p_name: orgName,
    p_selected_apps: selectedApps,
  })
  if (error) throw error

  const row = Array.isArray(data) ? (data[0] as { org_id: string; org_name: string } | undefined) : undefined
  if (!row) {
    throw new Error('Organisation creation did not return a row.')
  }

  void updateOnboardingMetadata({
    accounts_onboarding_completed: false,
    accounts_onboarding_stage: 'invite-members',
  }).catch(() => undefined)

  return {
    orgId: row.org_id,
    orgName: row.org_name,
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
