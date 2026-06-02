import { db } from '../supabaseClient'

export const fetchMyPermissions = async (companyId: string): Promise<string[]> => {
  const { data, error } = await db
    .from('my_permissions')
    .select('code')
    .eq('company_id', companyId)
    .order('code', { ascending: true })

  if (error) throw error

  return ((data as Array<{ code: string }> | null) ?? []).map((row) => row.code)
}
