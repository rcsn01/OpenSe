import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createWorkflowRule,
  deleteWorkflowRule,
  fetchProjectWorkflowRules,
  updateWorkflowRule,
} from '../../api/workflows'
import type { WorkflowRuleInput, WorkflowRuleUpdateInput } from '../../types'

export const workflowKeys = {
  project: (organisationId: string | null, projectId: string | null) =>
    ['open-kb', 'workflows', organisationId, projectId] as const,
}

export const useProjectWorkflowRules = (
  organisationId: string | null,
  projectId: string | null,
  enabled = true,
) =>
  useQuery({
    queryKey: workflowKeys.project(organisationId, projectId),
    queryFn: () => fetchProjectWorkflowRules(organisationId ?? '', projectId ?? ''),
    enabled: Boolean(organisationId && projectId && enabled),
  })

export const useCreateWorkflowRule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: WorkflowRuleInput) => createWorkflowRule(input),
    onSuccess: async (_rule, input) => {
      await queryClient.invalidateQueries({ queryKey: workflowKeys.project(input.organisation_id, input.project_id) })
    },
  })
}

export const useUpdateWorkflowRule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: WorkflowRuleUpdateInput) => updateWorkflowRule(input),
    onSuccess: async (_rule, input) => {
      await queryClient.invalidateQueries({ queryKey: workflowKeys.project(input.organisation_id, input.project_id) })
    },
  })
}

export const useDeleteWorkflowRule = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: (input: { organisationId: string; projectId: string; ruleId: string }) =>
      deleteWorkflowRule(input),
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: workflowKeys.project(input.organisationId, input.projectId) })
    },
  })
}
