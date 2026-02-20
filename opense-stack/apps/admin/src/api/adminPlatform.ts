import { supabase } from '@repo/shared/supabase'

export type AdminSystemHealthRow = {
  app_code: string
  uptime_percent: number
  error_spike_level: 'stable' | 'low' | 'medium' | 'high'
  active_alert_count: number
  incident_summary: string | null
  measured_at: string
}

export type AdminPricingPlanRow = {
  id: string
  app_code: string | null
  plan_name: string
  billing_interval: 'monthly' | 'yearly'
  seat_price_cents: number
  is_bundle: boolean
  stripe_product_id: string | null
  stripe_price_id: string | null
  is_active: boolean
  created_at: string
  updated_at: string
}

export type AdminCouponRow = {
  id: string
  code: string
  discount_percent: number
  duration: 'once' | 'repeating' | 'forever'
  duration_in_months: number | null
  stripe_coupon_id: string | null
  is_active: boolean
  created_at: string
}

export type AdminRevenueReportRow = {
  app_code: string
  app_name: string
  seat_limit_total: number
  estimated_mrr_cents: number
}

export type AdminOrgSeatSummaryRow = {
  app_code: string
  app_name: string
  seat_limit: number
  assigned_seats: number
}

export type AdminOrgMemberSeatAssignmentRow = {
  org_member_id: string
  user_id: string
  email: string | null
  full_name: string | null
  role: 'owner' | 'admin' | 'editor' | 'member'
  app_codes: string[]
}

export type PlatformAuditEventRow = {
  id: string
  actor_user_id: string | null
  actor_email: string | null
  actor_full_name: string | null
  action: string
  metadata: Record<string, unknown> | null
  created_at: string
}

export type AdminFeatureFlagRow = {
  id: string
  app_code: string | null
  flag_key: string
  rollout_status: 'enabled' | 'disabled' | 'beta'
  audience: string
  updated_at: string
}

export type AdminDefaultConfigurationRow = {
  id: string
  app_code: string | null
  config_key: string
  config_value: string
  updated_at: string
}

export type AdminReleaseNoteRow = {
  id: string
  app_code: string | null
  version: string
  summary: string
  published_at: string
}

export const listSystemHealth = async (): Promise<AdminSystemHealthRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_system_health')
  if (error) throw error
  return (data ?? []) as AdminSystemHealthRow[]
}

export const listPricingPlans = async (): Promise<AdminPricingPlanRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_pricing_plans')
  if (error) throw error
  return (data ?? []) as AdminPricingPlanRow[]
}

export const listCoupons = async (): Promise<AdminCouponRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_coupons')
  if (error) throw error
  return (data ?? []) as AdminCouponRow[]
}

export const updatePricingPlan = async (planId: string, seatPriceCents: number) => {
  let stripePriceId: string | null = null
  const { data: syncData, error: syncError } = await supabase.functions.invoke('admin-billing-sync', {
    body: {
      action: 'sync_pricing_plan',
      productName: `plan-${planId}`,
      seatPriceCents,
    },
  })

  if (syncError) {
    throw syncError
  }

  stripePriceId = typeof syncData?.stripePriceId === 'string' ? syncData.stripePriceId : null
  if (!stripePriceId) {
    throw new Error('Stripe pricing sync did not return stripePriceId')
  }

  const { data, error } = await supabase.rpc('admin_update_pricing_plan', {
    p_plan_id: planId,
    p_seat_price_cents: seatPriceCents,
    p_is_active: null,
    p_stripe_price_id: stripePriceId,
  })
  if (error) throw error
  return data as AdminPricingPlanRow
}

export const createCoupon = async (code: string, discountPercent: number) => {
  let stripeCouponId: string | null = null
  const { data: syncData, error: syncError } = await supabase.functions.invoke('admin-billing-sync', {
    body: {
      action: 'sync_coupon',
      code,
      discountPercent,
    },
  })

  if (syncError) {
    throw syncError
  }

  stripeCouponId = typeof syncData?.stripeCouponId === 'string' ? syncData.stripeCouponId : null
  if (!stripeCouponId) {
    throw new Error('Stripe coupon sync did not return stripeCouponId')
  }

  const { data, error } = await supabase.rpc('admin_create_coupon', {
    p_code: code,
    p_discount_percent: discountPercent,
    p_duration: 'once',
    p_duration_in_months: null,
    p_stripe_coupon_id: stripeCouponId,
  })
  if (error) throw error
  return data as AdminCouponRow
}

export const setCouponActive = async (couponId: string, isActive: boolean) => {
  const { data, error } = await supabase.rpc('admin_set_coupon_active', {
    p_coupon_id: couponId,
    p_is_active: isActive,
  })
  if (error) throw error
  return data as AdminCouponRow
}

export const listRevenueReportSummary = async (): Promise<AdminRevenueReportRow[]> => {
  const { data, error } = await supabase.rpc('admin_get_revenue_report_summary')
  if (error) throw error
  return (data ?? []) as AdminRevenueReportRow[]
}

export const listOrgSeatSummary = async (orgId: string): Promise<AdminOrgSeatSummaryRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_org_app_seat_summary', { p_org_id: orgId })
  if (error) throw error
  return (data ?? []) as AdminOrgSeatSummaryRow[]
}

export const listOrgMemberSeatAssignments = async (orgId: string): Promise<AdminOrgMemberSeatAssignmentRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_org_member_seat_assignments', { p_org_id: orgId })
  if (error) throw error
  return (data ?? []) as AdminOrgMemberSeatAssignmentRow[]
}

export const updateOrgSeatLimit = async (orgId: string, appCode: string, seatLimit: number) => {
  const { error } = await supabase.rpc('admin_update_org_seat_limit', {
    p_org_id: orgId,
    p_app_code: appCode,
    p_seat_limit: seatLimit,
  })
  if (error) throw error
}

export const updateOrgSeatLimits = async (orgId: string, etlSeatLimit: number, stoqrSeatLimit: number) => {
  const { error } = await supabase.rpc('admin_update_org_seat_limits', {
    p_org_id: orgId,
    p_etl_seat_limit: etlSeatLimit,
    p_stoqr_seat_limit: stoqrSeatLimit,
  })
  if (error) throw error
}

export const listPlatformAuditEvents = async (limit = 100): Promise<PlatformAuditEventRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_platform_audit_events', { p_limit: limit })
  if (error) throw error
  return (data ?? []) as PlatformAuditEventRow[]
}

export const listFeatureFlags = async (appCode: string | null): Promise<AdminFeatureFlagRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_feature_flags', { p_app_code: appCode })
  if (error) throw error
  return (data ?? []) as AdminFeatureFlagRow[]
}

export const updateFeatureFlag = async (flagId: string, rolloutStatus: 'enabled' | 'disabled' | 'beta', audience?: string) => {
  const { data, error } = await supabase.rpc('admin_update_feature_flag', {
    p_flag_id: flagId,
    p_rollout_status: rolloutStatus,
    p_audience: audience ?? null,
  })
  if (error) throw error
  return data as AdminFeatureFlagRow
}

export const listDefaultConfigurations = async (appCode: string | null): Promise<AdminDefaultConfigurationRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_default_configurations', { p_app_code: appCode })
  if (error) throw error
  return (data ?? []) as AdminDefaultConfigurationRow[]
}

export const upsertDefaultConfiguration = async (appCode: string | null, configKey: string, configValue: string) => {
  const { data, error } = await supabase.rpc('admin_upsert_default_configuration', {
    p_app_code: appCode,
    p_config_key: configKey,
    p_config_value: configValue,
  })
  if (error) throw error
  return data as AdminDefaultConfigurationRow
}

export const listReleaseNotes = async (appCode: string | null): Promise<AdminReleaseNoteRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_release_notes', { p_app_code: appCode })
  if (error) throw error
  return (data ?? []) as AdminReleaseNoteRow[]
}
