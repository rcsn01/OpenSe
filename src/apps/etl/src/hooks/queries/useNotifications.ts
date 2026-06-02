import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import {
  listNotificationSettings,
  upsertNotificationSetting,
  deleteNotificationSetting,
} from '../../api/notifications'
import { notificationKeys } from './queryKeys'

/**
 * Fetches notification settings for a workflow.
 */
export const useNotificationSettings = (workflowId: string | null) => {
  return useQuery({
    queryKey: notificationKeys.settings(workflowId),
    queryFn: () => (workflowId ? listNotificationSettings(workflowId) : []),
    enabled: !!workflowId,
    staleTime: 1000 * 60,
  })
}

/**
 * Mutation: create or update a notification setting.
 */
export const useUpsertNotificationSetting = () => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: upsertNotificationSetting,
    onSuccess: (_data, variables) => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings(variables.workflowId) })
    },
  })
}

/**
 * Mutation: delete a notification setting.
 */
export const useDeleteNotificationSetting = (workflowId: string | null) => {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: deleteNotificationSetting,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: notificationKeys.settings(workflowId) })
    },
  })
}
