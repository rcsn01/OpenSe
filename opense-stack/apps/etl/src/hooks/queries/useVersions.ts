import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listWorkflowVersions,
  getWorkflowVersion,
  createWorkflowVersion,
} from '../../api/versions'
import { versionKeys } from './queryKeys'

/**
 * Fetches all versions for a given workflow.
 */
export const useWorkflowVersions = (workflowId: string | null) => {
  return useQuery({
    queryKey: versionKeys.list(workflowId),
    queryFn: () => (workflowId ? listWorkflowVersions(workflowId) : []),
    enabled: !!workflowId,
    staleTime: 1000 * 30,
  })
}

/**
 * Fetches a single version by ID.
 */
export const useWorkflowVersion = (versionId: string | null) => {
  return useQuery({
    queryKey: versionKeys.detail(versionId),
    queryFn: () => (versionId ? getWorkflowVersion(versionId) : null),
    enabled: !!versionId,
  })
}

/**
 * Mutation: create a new version snapshot.
 */
export const useCreateWorkflowVersion = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createWorkflowVersion,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: versionKeys.list(variables.workflowId) })
    },
  })
}
