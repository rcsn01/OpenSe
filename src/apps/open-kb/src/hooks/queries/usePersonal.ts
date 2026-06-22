import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useCallback, useRef } from 'react'
import {
  addFavorite,
  fetchFavorites,
  fetchRecentVisits,
  recordRecentVisit,
  removeFavorite,
} from '../../api/personal'
import type { PersonalItemInput } from '../../api/personal'

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

const recentVisitKey = (input: PersonalItemInput) => [
  input.organisationId,
  input.profileId,
  input.kind,
  input.projectId ?? '',
  input.issueId ?? '',
  input.pageId ?? '',
].join(':')

export const useRecordRecentVisitOnce = () => {
  const { mutate } = useRecordRecentVisit()
  const recordedKeysRef = useRef(new Set<string>())

  return useCallback((input: PersonalItemInput) => {
    const key = recentVisitKey(input)
    if (recordedKeysRef.current.has(key)) return

    recordedKeysRef.current.add(key)
    mutate(input, {
      onError: () => {
        recordedKeysRef.current.delete(key)
      },
    })
  }, [mutate])
}
