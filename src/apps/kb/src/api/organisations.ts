import { supabase } from '../supabaseClient'
import type { OrganisationOption } from '../types'

type MembershipRow = {
  org_id: string
  organisations: { id: string; name: string } | { id: string; name: string }[] | null
}

const normalizeSingle = <T,>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

export const fetchUserOpenKbOrganisations = async (
  userId: string,
): Promise<OrganisationOption[]> => {
  const { data, error } = await supabase
    .from('organisation_members')
    .select('org_id, organisations(id, name), organisation_member_app_seats!inner(app_code)')
    .eq('user_id', userId)
    .eq('organisation_member_app_seats.app_code', 'open-kb')

  if (error) throw error

  return ((data ?? []) as MembershipRow[])
    .map((row) => {
      const organisation = normalizeSingle(row.organisations)
      return {
        id: organisation?.id ?? row.org_id,
        name: organisation?.name ?? 'Unknown organisation',
      }
    })
    .filter((organisation) => Boolean(organisation.id))
}
