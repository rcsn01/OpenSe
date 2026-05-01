import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  deleteWorkflow,
  getWorkflow,
  listWorkflows,
  saveWorkflow,
  updateWorkflowName,
} from '../../api/workflows'
import { useAuth } from '@repo/shared/auth/context'
import { useDemoContext } from '../../context/DemoContext'
import { DEMO_USER_ID, DEMO_USER_EMAIL, DEMO_USER_NAME } from '../../lib/demoData'
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
  const { isDemoUser } = useAuth()
  const { listDemoWorkflows } = useDemoContext()
  const isDemo = Boolean(isDemoUser)

  return useQuery<WorkflowRow[]>({
    queryKey: workflowKeys.list(userId, orgId, mode, isDemo),
    queryFn: () => {
      if (isDemo) {
        return listDemoWorkflows(mode)
      }
      return userId ? listWorkflows({ userId, orgId, mode }) : []
    },
    enabled: !!userId,
  })
}

// Fetch a single workflow
export const useWorkflow = (id: string | null) => {
  const { isDemoUser } = useAuth()
  const { getDemoWorkflow } = useDemoContext()
  const isDemo = Boolean(isDemoUser)

  return useQuery<WorkflowDetail | null>({
    queryKey: workflowKeys.detail(id, isDemo),
    queryFn: () => {
      if (isDemo && id) {
        const workflow = getDemoWorkflow(id)
        return workflow ? normalizeWorkflowDetail(workflow) : null
      }
      return id ? getWorkflow(id).then((workflow) => normalizeWorkflowDetail(workflow)) : null
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
  const { isDemoUser } = useAuth()
  const { saveDemoWorkflow } = useDemoContext()

  return useMutation({
    mutationFn: async (payload: SaveWorkflowParams) => {
      if (isDemoUser) {
        return saveDemoWorkflow({
          id: payload.id || `demo-wf-${Date.now()}`,
          name: payload.name,
          graph_data: payload.graph_data,
          owner_id: DEMO_USER_ID,
          org_id: payload.org_id,
          created_at: new Date().toISOString(),
          owner: { full_name: DEMO_USER_NAME, email: DEMO_USER_EMAIL },
        })
      }
      return saveWorkflow(payload)
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all })
      queryClient.invalidateQueries({ queryKey: workflowKeys.detailBase(data.id) })
    },
  })
}

// Update workflow name only
export const useUpdateWorkflowName = () => {
  const queryClient = useQueryClient()
  const { isDemoUser } = useAuth()
  const { getDemoWorkflow, saveDemoWorkflow } = useDemoContext()

  return useMutation({
    mutationFn: async ({ id, name }: { id: string; name: string }) => {
      if (isDemoUser) {
        const existing = getDemoWorkflow(id)
        if (existing) {
          return saveDemoWorkflow({ ...existing, name })
        }
        return { id, name }
      }
      return updateWorkflowName({ id, name })
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all })
      queryClient.setQueryData(workflowKeys.detailBase(data.id), (old: any) => (old ? { ...old, name: data.name } : old))
    },
  })
}

export const useDeleteWorkflow = () => {
  const queryClient = useQueryClient()
  const { isDemoUser } = useAuth()
  const { deleteDemoWorkflow } = useDemoContext()

  return useMutation({
    mutationFn: async (workflowId: string) => {
      if (isDemoUser) {
        deleteDemoWorkflow(workflowId)
        return
      }
      await deleteWorkflow(workflowId)
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: workflowKeys.all })
    },
  })
}
