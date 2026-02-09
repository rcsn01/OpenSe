import { supabase } from '../lib/supabase'
import type { ExecutionLog } from '../components/shared/ActivityLogTable'

export const listExecutionLogs = async (userId: string, orgId: string | null | undefined): Promise<ExecutionLog[]> => {
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
  return (data ?? []).map((row: any) => ({
    id: row.id,
    workflow_id: row.workflow_id,
    status: row.status,
    started_at: row.started_at,
    completed_at: row.completed_at,
    error_message: row.error_message,
    workflows: Array.isArray(row.workflows) ? row.workflows[0] ?? null : row.workflows ?? null,
    profiles: Array.isArray(row.profiles) ? row.profiles[0] ?? null : row.profiles ?? null,
  })) as ExecutionLog[]
}
