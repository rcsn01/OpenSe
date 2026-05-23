import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  saveWorkflow,
  updateWorkflowName,
} from '../../api/workflows'
import type { WorkflowRow } from '../../components/dashboard/types'
import { workflowKeys } from './queryKeys'

type UseWorkflowsParams = {
  userId: string | undefined
  orgId: string | null | undefined
  mode: 'personal' | 'org'
}

type WorkflowDetail = {
  id: string
  name: string
  graph_data: any
  owner_id: string
  org_id: string | null
  is_template: boolean
}

const normalizeWorkflowDetail = (
  workflow: Omit<WorkflowDetail, 'is_template'> & { is_template?: boolean },
): WorkflowDetail => ({
  ...workflow,
  is_template: Boolean(workflow.is_template),
})

export const useWorkflows = ({ userId, orgId, mode }: UseWorkflowsParams) => {
  return useQuery<WorkflowRow[]>({
    queryKey: workflowKeys.list(userId, orgId, mode),
    queryFn: () => (userId ? listWorkflows({ userId, orgId, mode }) : []),
    enabled: !!userId,
  })
}

// Fetch a single workflow
export const useWorkflow = (id: string | null) => {
  return useQuery<WorkflowDetail | null>({
    queryKey: workflowKeys.detail(id),
    queryFn: () => (id ? getWorkflow(id).then((workflow) => normalizeWorkflowDetail(workflow)) : null),
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
    mutationFn: (payload: SaveWorkflowParams) => saveWorkflow(payload),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all })
      queryClient.invalidateQueries({ queryKey: workflowKeys.detailBase(data.id) })
    },
  })
}

// Update workflow name only
export const useUpdateWorkflowName = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: ({ id, name }: { id: string; name: string }) => updateWorkflowName({ id, name }),
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all })
      queryClient.setQueryData(workflowKeys.detailBase(data.id), (old: any) => (old ? { ...old, name: data.name } : old))
    },
  })
}

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (workflowId: string) => deleteWorkflow(workflowId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all })
    },
  })
}
