import { supabase } from '../lib/supabase'

export const listExecutionLogs = async (userId: string, orgId: string | null | undefined) => {
  let query = supabase
    .from('workflow_executions')
    .select(
      `id, workflow_id, status, started_at, completed_at, error_message,
       workflows (name), profiles (email, full_name)`
    )
    .order('started_at', { ascending: false })
    .limit(50)

  if (orgId) {
    query = query.eq('org_id', orgId)
  } else {
    query = query.eq('user_id', userId).is('org_id', null)
  }

  const { data, error } = await query
  if (error) throw error
  return data ?? []
}
