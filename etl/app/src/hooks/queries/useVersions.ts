import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listWorkflowVersions,
  getWorkflowVersion,
  createWorkflowVersion,
} from '../../api/versions'

/**
 * Fetches all versions for a given workflow.
 */
export const useWorkflowVersions = (workflowId: string | null) => {
  return useQuery({
    queryKey: ['workflowVersions', workflowId],
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
    queryKey: ['workflowVersion', versionId],
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
      queryClient.invalidateQueries({ queryKey: ['workflowVersions', variables.workflowId] })
    },
  })
}
