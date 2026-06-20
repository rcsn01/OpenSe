import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  fetchNotificationPreference,
  fetchNotifications,
  markAllNotificationsRead,
  markNotificationRead,
  setIssueNotificationsEnabled,
} from '../../api/notifications'

export const notificationKeys = {
  list: (organisationId: string | null, profileId: string | null) =>
    ['open-kb', 'notifications', organisationId, profileId] as const,
  preference: (organisationId: string | null, profileId: string | null) =>
    ['open-kb', 'notifications', organisationId, profileId, 'preference'] as const,
}

export const useNotifications = (organisationId: string | null, profileId: string | null) =>
  useQuery({
    queryKey: notificationKeys.list(organisationId, profileId),
    queryFn: () => fetchNotifications({ organisationId: organisationId ?? '', profileId: profileId ?? '' }),
    enabled: Boolean(organisationId && profileId),
  })

export const useNotificationPreference = (organisationId: string | null, profileId: string | null) =>
  useQuery({
    queryKey: notificationKeys.preference(organisationId, profileId),
    queryFn: () => fetchNotificationPreference({ organisationId: organisationId ?? '', profileId: profileId ?? '' }),
    enabled: Boolean(organisationId && profileId),
  })

export const useMarkNotificationRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markNotificationRead,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: ['open-kb', 'notifications', input.organisationId] })
    },
  })
}

export const useMarkAllNotificationsRead = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: markAllNotificationsRead,
    onSuccess: async (_result, input) => {
      await queryClient.invalidateQueries({ queryKey: notificationKeys.list(input.organisationId, input.profileId) })
    },
  })
}

export const useSetIssueNotificationsEnabled = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: setIssueNotificationsEnabled,
    onSuccess: async (_preference, input) => {
      await queryClient.invalidateQueries({
        queryKey: notificationKeys.preference(input.organisationId, input.profileId),
      })
    },
  })
}
