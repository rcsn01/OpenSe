import { supabase } from '@repo/shared/supabase'

export type AppCode = 'etl' | 'stoqr'

export interface OrgContext {
  orgId: string
  orgName: string
  role: 'owner' | 'admin' | 'editor' | 'member'
  stripeCustomerId: string | null
  stripeSubscriptionId: string | null
  billingName: string | null
  billingEmail: string | null
  billingPhone: string | null
}

export interface AppSeatBillingSummary {
  appCode: AppCode
  appName: string
  seatLimit: number | null
  assignedSeats: number
}

export interface BillingSummary {
  organisation: OrgContext
  apps: AppSeatBillingSummary[]
}

interface OrgContextRow {
  org_id: string
  org_name: string
  member_role: OrgContext['role']
  stripe_customer_id: string | null
  stripe_subscription_id: string | null
  billing_name: string | null
  billing_email: string | null
  billing_phone: string | null
}

interface AppSeatSummaryRow {
  app_code: AppCode
  app_name: string | null
  seat_limit: number | null
  assigned_seats: number
}

const appNameMap: Record<AppCode, string> = {
  etl: 'ETL',
  stoqr: 'StoQR',
}

const getCurrentOrgContext = async (): Promise<OrgContext> => {
  const { data, error } = await supabase.rpc('accounts_get_my_org_context')
  if (error) throw error

  const contextRow = Array.isArray(data) ? (data[0] as OrgContextRow | undefined) : undefined
  if (!contextRow) {
    throw new Error('No organisation membership found for the current user.')
  }

  return {
    orgId: contextRow.org_id,
    orgName: contextRow.org_name,
    role: contextRow.member_role,
    stripeCustomerId: contextRow.stripe_customer_id,
    stripeSubscriptionId: contextRow.stripe_subscription_id,
    billingName: contextRow.billing_name,
    billingEmail: contextRow.billing_email,
    billingPhone: contextRow.billing_phone,
  }
}

export const getOrganisationBillingSummary = async (): Promise<BillingSummary> => {
  const organisation = await getCurrentOrgContext()

  const { data: appSummaryRows, error: appSummaryError } = await supabase.rpc('accounts_get_org_app_seat_summary')
  if (appSummaryError) throw appSummaryError

  const apps: AppSeatBillingSummary[] = ((appSummaryRows ?? []) as AppSeatSummaryRow[])
    .filter(
      (row): row is AppSeatSummaryRow => row.app_code === 'etl' || row.app_code === 'stoqr',
    )
    .map((row) => ({
      appCode: row.app_code,
      appName: row.app_name ?? appNameMap[row.app_code],
      seatLimit: row.seat_limit,
      assignedSeats: row.assigned_seats,
    }))

  return {
    organisation,
    apps,
  }
}

export const updateSeatLimit = async (appCode: AppCode, seatLimit: number): Promise<void> => {
  if (!Number.isInteger(seatLimit) || seatLimit < 0) {
    throw new Error('Seat limit must be a non-negative integer.')
  }

  const { data, error } = await supabase.functions.invoke('update-subscription', {
    body: {
      appCode,
      seatLimit,
    },
  })

  if (error) throw error
  if (data?.error) throw new Error(data.error)
}

export const createCheckoutForSeatLimit = async (appCode: AppCode, seatLimit: number): Promise<string> => {
  const organisation = await getCurrentOrgContext()

  const successUrl = `${window.location.origin}/account/billing?success=true`
  const cancelUrl = `${window.location.origin}/account/billing?canceled=true`

  const { data, error } = await supabase.functions.invoke('create-checkout', {
    body: {
      orgId: organisation.orgId,
      orgName: organisation.orgName,
      appCode,
      seatLimit,
      successUrl,
      cancelUrl,
    },
  })

  if (error) throw error
  if (!data?.url) {
    throw new Error(data?.error ?? 'Checkout URL not returned')
  }

  return data.url as string
}

export const createBillingPortalSession = async (): Promise<string> => {
  const returnUrl = `${window.location.origin}/account/billing`
  const { data, error } = await supabase.functions.invoke('create-billing-portal', {
    body: { returnUrl },
  })

  if (error) throw error
  if (!data?.url) {
    throw new Error(data?.error ?? 'Billing portal URL not returned')
  }

  return data.url as string
}
