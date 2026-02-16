/**
 * Onboarding API: org membership check, free-tier org creation.
 */
import { supabase } from '@repo/shared/supabase'
import type { AppCode } from './organisationBilling'

const FREE_TIER_SEATS = 5

export const userHasOrganisation = async (): Promise<boolean> => {
  const { data, error } = await supabase.rpc('get_primary_org_for_user')
  if (error) throw error
  return data != null && data !== ''
}

export const createFreeTierOrganisation = async (
  name: string,
  estimatedPeople: number | null,
  appCodes: AppCode[]
): Promise<string> => {
  const { data, error } = await supabase.rpc('accounts_create_free_tier_organisation', {
    p_name: name.trim(),
    p_estimated_people: estimatedPeople,
    p_app_codes: appCodes.length > 0 ? appCodes : ['etl', 'stoqr'],
  })
  if (error) throw error
  if (!data) throw new Error('Organisation creation returned no ID')
  return data as string
}

export { FREE_TIER_SEATS }
