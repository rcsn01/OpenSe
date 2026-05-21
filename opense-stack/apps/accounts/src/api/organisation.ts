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
  const { data, error } = await supabase.rpc('accounts_get_organisation_profile')
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
  const { data, error } = await supabase.rpc('accounts_update_organisation_profile', {
    p_org_name: orgName.trim(),
    p_primary_contact_name: primaryContactName?.trim() || null,
    p_primary_contact_email: primaryContactEmail?.trim() || null,
  })
  if (error) throw error

  const row = Array.isArray(data) ? (data[0] as OrganisationProfileRow | undefined) : undefined
  if (!row) throw new Error('Updated organisation profile was not returned.')
  return mapOrganisation(row)
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
  const { data, error } = await supabase.rpc('accounts_update_billing_contact', {
    p_billing_name: billingName?.trim() || null,
    p_billing_email: billingEmail?.trim() || null,
    p_billing_phone: billingPhone?.trim() || null,
  })
  if (error) throw error

  const row = Array.isArray(data) ? (data[0] as OrganisationProfileRow | undefined) : undefined
  if (!row) throw new Error('Updated billing contact was not returned.')
  return mapOrganisation(row)
}

export const transferOrganisationOwnership = async (targetUserId: string): Promise<void> => {
  const { error } = await supabase.rpc('accounts_transfer_organisation_ownership', {
    p_new_owner_user_id: targetUserId,
  })
  if (error) throw error
}
