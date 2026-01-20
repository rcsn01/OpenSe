import { supabase } from '../lib/supabase'

export const logExecutionRun = async (params: {
  workflowId: string
  userId: string
  orgId: string | null
  status: 'success' | 'failed'
  startedAt: string
  completedAt: string
  errorMessage: string | null
}) => {
  const { error } = await supabase.from('workflow_executions').insert({
    workflow_id: params.workflowId,
    user_id: params.userId,
    org_id: params.orgId,
    status: params.status,
    started_at: params.startedAt,
    completed_at: params.completedAt,
    error_message: params.errorMessage,
  })

  if (error) throw error
}
