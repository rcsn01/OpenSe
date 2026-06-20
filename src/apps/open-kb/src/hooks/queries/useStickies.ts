import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  createSticky,
  deleteSticky,
  fetchStickies,
  updateSticky,
} from '../../api/stickies'

export const stickyKeys = {
  list: (organisationId: string | null, profileId: string | null, projectId?: string | null) =>
    ['open-kb', 'stickies', organisationId, profileId, projectId ?? 'all'] as const,
}

export const useStickies = (
  organisationId: string | null,
  profileId: string | null,
  projectId?: string | null,
) =>
  useQuery({
    queryKey: stickyKeys.list(organisationId, profileId, projectId),
    queryFn: () => fetchStickies({
      organisationId: organisationId ?? '',
      profileId: profileId ?? '',
      projectId,
    }),
    enabled: Boolean(organisationId && profileId),
  })

export const useCreateSticky = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: createSticky,
    onSuccess: async (_sticky, input) => {
      await queryClient.invalidateQueries({
        queryKey: ['open-kb', 'stickies', input.organisation_id, input.profile_id],
      })
    },
  })
}

export const useUpdateSticky = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: updateSticky,
    onSuccess: async (sticky) => {
      await queryClient.invalidateQueries({
        queryKey: ['open-kb', 'stickies', sticky.organisation_id, sticky.profile_id],
      })
    },
  })
}

export const useDeleteSticky = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteSticky,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ['open-kb', 'stickies', input.organisationId],
      })
    },
  })
}
