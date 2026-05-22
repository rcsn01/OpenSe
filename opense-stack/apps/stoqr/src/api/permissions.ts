import { supabase } from '../supabaseClient'

export const fetchMyPermissions = async (companyId: string): Promise<string[]> => {
  const { data, error } = await supabase.rpc('get_stoqr_my_permissions', {
    target_company_id: companyId,
  })

  if (error) throw error

  return ((data as Array<{ code: string }> | string[] | null) ?? []).map((row) =>
    typeof row === 'string' ? row : row.code,
  )
}
