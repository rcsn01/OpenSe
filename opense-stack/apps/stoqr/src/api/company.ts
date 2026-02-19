import { supabase } from '../supabaseClient'
import type { CompanyOption } from '../types'

type MembershipRow = {
  org_id: string
  organisations: { id: string; name: string } | { id: string; name: string }[] | null
}

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchUserCompanies = async (userId: string): Promise<CompanyOption[]> => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('org_id, organisations(id, name)')
    .eq('user_id', userId)

  if (error) throw error

  return ((data ?? []) as MembershipRow[])
    .map((item) => {
      const organisation = normalizeSingle(item.organisations)
      return {
        id: organisation?.id ?? item.org_id,
        name: organisation?.name ?? 'Unknown',
      }
    })
    .filter((item) => item.id)
}
