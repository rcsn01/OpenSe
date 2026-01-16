import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { supabase } from '../../lib/supabase'
import { WorkflowRow } from '../../components/dashboard/types'

type UseWorkflowsParams = {
  userId: string | undefined
  orgId: string | null | undefined
  mode: 'personal' | 'org'
}

export const useWorkflows = ({ userId, orgId, mode }: UseWorkflowsParams) => {
  return useQuery({
    queryKey: ['workflows', userId, orgId, mode],
    queryFn: async () => {
      if (!userId) return []

      let query = supabase
        .from('workflows')
        .select('id, name, created_at, owner_id, org_id')
        .order('created_at', { ascending: false })

      if (mode === 'org') {
        if (!orgId) return []
        query = query.eq('org_id', orgId)
      } else {
        query = query.eq('owner_id', userId).is('org_id', null)
      }

      const { data, error } = await query

      if (error) throw error
      return data as WorkflowRow[]
    },
    enabled: !!userId,
  })
}

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (workflowId: string) => {
      const { error } = await supabase.from('workflows').delete().eq('id', workflowId)
      if (error) throw error
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}
