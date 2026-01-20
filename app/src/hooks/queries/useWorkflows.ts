import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { WorkflowRow } from '../../components/dashboard/types'
import {
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  saveWorkflow,
  updateWorkflowName,
} from '../../api/workflows'

type UseWorkflowsParams = {
  userId: string | undefined
  orgId: string | null | undefined
  mode: 'personal' | 'org'
}

export const useWorkflows = ({ userId, orgId, mode }: UseWorkflowsParams) => {
  return useQuery({
    queryKey: ['workflows', userId, orgId, mode],
    queryFn: () => (userId ? listWorkflows({ userId, orgId, mode }) : []),
    enabled: !!userId,
  })
}

// Fetch a single workflow
export const useWorkflow = (id: string | null) => {
  return useQuery({
    queryKey: ['workflow', id],
    queryFn: () => (id ? getWorkflow(id) : null),
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
      return saveWorkflow(payload)
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
      return updateWorkflowName({ id, name })
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
      await deleteWorkflow(workflowId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['workflows'] })
    },
  })
}
