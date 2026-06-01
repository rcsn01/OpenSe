import { supabase } from '@repo/shared/supabase'
import type { SeatMemberRole } from './seatAssignments'

export interface OrganisationProfile {
  orgId: string
  orgName: string
  status: string
  role: SeatMemberRole
  ownerUserId: string
  ownerFullName: string | null
  ownerEmail: string | null
  primaryContactName: string | null
  primaryContactEmail: string | null
  billingName: string | null
  billingEmail: string | null
  billingPhone: string | null
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
}

interface OrganisationProfileRow {
  org_id: string
  org_name: string
  status: string
  member_role: SeatMemberRole
  owner_user_id: string
  owner_full_name: string | null
  owner_email: string | null
  primary_contact_name: string | null
  primary_contact_email: string | null
  billing_name: string | null
  billing_email: string | null
  billing_phone: string | null
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
}

const mapOrganisation = (row: OrganisationProfileRow): OrganisationProfile => ({
  orgId: row.org_id,
  orgName: row.org_name,
  status: row.status,
  role: row.member_role,
  ownerUserId: row.owner_user_id,
  ownerFullName: row.owner_full_name,
  ownerEmail: row.owner_email,
  primaryContactName: row.primary_contact_name,
  primaryContactEmail: row.primary_contact_email,
  billingName: row.billing_name,
  billingEmail: row.billing_email,
  billingPhone: row.billing_phone,
  stripeCustomerId: row.stripe_customer_id,
  stripeSubscriptionId: row.stripe_subscription_id,
})

export const canManageOrganisation = (role: string | null | undefined) => role === 'owner' || role === 'admin'
export const canTransferOwnership = (role: string | null | undefined) => role === 'owner'

export const getOrganisationProfile = async (): Promise<OrganisationProfile> => {
  const { data, error } = await supabase
    .from('account_organisation_profile')
    .select('org_id, org_name, status, member_role, owner_user_id, owner_full_name, owner_email, primary_contact_name, primary_contact_email, billing_name, billing_email, billing_phone, stripe_customer_id, stripe_subscription_id')
    .order('member_created_at', { ascending: true })
    .limit(1)
  if (error) throw error

  const row = Array.isArray(data) ? (data[0] as OrganisationProfileRow | undefined) : undefined
  if (!row) throw new Error('No organisation profile found.')
  return mapOrganisation(row)
}

export const updateOrganisationProfile = async ({
  orgName,
  primaryContactName,
  primaryContactEmail,
}: {
  orgName: string
  primaryContactName: string | null
  primaryContactEmail: string | null
}): Promise<OrganisationProfile> => {
  const current = await getOrganisationProfile()
  const { error } = await supabase
    .from('organisations')
    .update({
      name: orgName.trim(),
      primary_contact_name: primaryContactName?.trim() || null,
      primary_contact_email: primaryContactEmail?.trim().toLowerCase() || null,
    })
    .eq('id', current.orgId)
  if (error) throw error

  return getOrganisationProfile()
}

export const updateBillingContact = async ({
  billingName,
  billingEmail,
  billingPhone,
}: {
  billingName: string | null
  billingEmail: string | null
  billingPhone: string | null
}): Promise<OrganisationProfile> => {
  const current = await getOrganisationProfile()
  const { error } = await supabase
    .from('organisations')
    .update({
      billing_name: billingName?.trim() || null,
      billing_email: billingEmail?.trim().toLowerCase() || null,
      billing_phone: billingPhone?.trim() || null,
    })
    .eq('id', current.orgId)
  if (error) throw error

  return getOrganisationProfile()
}

export const transferOrganisationOwnership = async (targetUserId: string): Promise<void> => {
  const { error } = await supabase.rpc('accounts_transfer_organisation_ownership', {
    p_new_owner_user_id: targetUserId,
  })
  if (error) throw error
}
