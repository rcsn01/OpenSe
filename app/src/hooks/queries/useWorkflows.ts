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

// Fetch a single workflow
export const useWorkflow = (id: string | null) => {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: async () => {
      if (!id) return null
      const { data, error } = await supabase
        .from('workflows')
        .select('id, name, graph_data, owner_id, org_id')
        .eq('id', id)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!id && id !== 'new',
    staleTime: 1000 * 60 * 5,
  })
}

type SaveWorkflowParams = {
  id?: string | null
  name: string
  graph_data: any
  owner_id: string
  org_id: string | null
}

// Insert or update a workflow
export const useSaveWorkflow = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (payload: SaveWorkflowParams) => {
      if (payload.id) {
        const { data, error } = await supabase
          .from('workflows')
          .update({
            name: payload.name,
            graph_data: payload.graph_data,
          })
          .eq('id', payload.id)
          .select()
          .single()

        if (error) throw error
        return data
      }

      const { data, error } = await supabase
        .from('workflows')
        .insert({
          name: payload.name,
          graph_data: payload.graph_data,
          owner_id: payload.owner_id,
          org_id: payload.org_id,
        })
        .select()
        .single()

      if (error) throw error
      return data
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.invalidateQueries({ queryKey: ['workflow', data.id] })
    },
  })
}

// Update workflow name only
export const useUpdateWorkflowName = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      const { error } = await supabase
        .from('workflows')
        .update({ name })
        .eq('id', id)

      if (error) throw error
      return { id, name }
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
      queryClient.setQueryData(['workflow', data.id], (old: any) => (old ? { ...old, name: data.name } : old))
    },
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
