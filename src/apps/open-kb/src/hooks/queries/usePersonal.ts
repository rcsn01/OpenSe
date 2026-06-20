import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  addFavorite,
  fetchFavorites,
  fetchRecentVisits,
  recordRecentVisit,
  removeFavorite,
} from '../../api/personal'

export const personalKeys = {
  favorites: (organisationId: string | null, profileId: string | null) =>
    ['open-kb', 'personal', organisationId, profileId, 'favorites'] as const,
  recent: (organisationId: string | null, profileId: string | null) =>
    ['open-kb', 'personal', organisationId, profileId, 'recent'] as const,
}

export const useFavorites = (organisationId: string | null, profileId: string | null) =>
  useQuery({
    queryKey: personalKeys.favorites(organisationId, profileId),
    queryFn: () => fetchFavorites({ organisationId: organisationId ?? '', profileId: profileId ?? '' }),
    enabled: Boolean(organisationId && profileId),
  })

export const useRecentVisits = (organisationId: string | null, profileId: string | null) =>
  useQuery({
    queryKey: personalKeys.recent(organisationId, profileId),
    queryFn: () => fetchRecentVisits({ organisationId: organisationId ?? '', profileId: profileId ?? '' }),
    enabled: Boolean(organisationId && profileId),
  })

export const useAddFavorite = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: addFavorite,
    onSuccess: async (_favorite, input) => {
      await queryClient.invalidateQueries({
        queryKey: personalKeys.favorites(input.organisationId, input.profileId),
      })
    },
  })
}

export const useRemoveFavorite = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: removeFavorite,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({
        queryKey: ['open-kb', 'personal', input.organisationId],
      })
    },
  })
}

export const useRecordRecentVisit = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: recordRecentVisit,
    onSuccess: async (_visit, input) => {
      await queryClient.invalidateQueries({
        queryKey: personalKeys.recent(input.organisationId, input.profileId),
      })
    },
  })
}
