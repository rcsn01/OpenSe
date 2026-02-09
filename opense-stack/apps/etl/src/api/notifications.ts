import { db } from '../lib/supabase'

export type NotificationChannel = 'email' | 'slack' | 'webhook'

export type NotificationSetting = {
  id: string
  workflow_id: string
  channel: NotificationChannel
  enabled: boolean
  config: Record<string, any>
  created_by: string | null
  created_at: string
  updated_at: string
}

/**
 * Fetches all notification settings for a workflow.
 */
export const listNotificationSettings = async (workflowId: string): Promise<NotificationSetting[]> => {
  const { data, error } = await db
    .from('notification_settings')
    .select('*')
    .eq('workflow_id', workflowId)
    .order('channel', { ascending: true })

  if (error) throw error
  return data as NotificationSetting[]
}

/**
 * Creates or updates a notification setting for a workflow+channel combo.
 * Uses upsert on the unique(workflow_id, channel) constraint.
 */
export const upsertNotificationSetting = async (params: {
  workflowId: string
  channel: NotificationChannel
  enabled: boolean
  config: Record<string, any>
  userId: string
}): Promise<NotificationSetting> => {
  const { data, error } = await db
    .from('notification_settings')
    .upsert(
      {
        workflow_id: params.workflowId,
        channel: params.channel,
        enabled: params.enabled,
        config: params.config,
        created_by: params.userId,
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'workflow_id,channel' }
    )
    .select()
    .single()

  if (error) throw error
  return data as NotificationSetting
}

/**
 * Deletes a notification setting.
 */
export const deleteNotificationSetting = async (id: string): Promise<void> => {
  const { error } = await db
    .from('notification_settings')
    .delete()
    .eq('id', id)

  if (error) throw error
}
