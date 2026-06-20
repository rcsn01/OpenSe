import { db } from '../supabaseClient'
import type { OpenKbNotification, OpenKbNotificationPreference } from '../types'

const notificationSelect = `
  id,
  organisation_id,
  project_id,
  issue_id,
  profile_id,
  actor_profile_id,
  name,
  title,
  description_text,
  status,
  payload,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

const notificationPreferenceSelect = `
  id,
  organisation_id,
  profile_id,
  name,
  status,
  payload,
  created_by,
  created_at,
  updated_at,
  deleted_at
`

export const fetchNotifications = async ({
  organisationId,
  profileId,
}: {
  organisationId: string
  profileId: string
}): Promise<OpenKbNotification[]> => {
  const { data, error } = await db
    .from('notifications')
    .select(notificationSelect)
    .eq('organisation_id', organisationId)
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  return (data ?? []) as unknown as OpenKbNotification[]
}

export const markNotificationRead = async ({
  organisationId,
  notificationId,
}: {
  organisationId: string
  notificationId: string
}) => {
  const { error } = await db
    .from('notifications')
    .update({ status: 'read' })
    .eq('organisation_id', organisationId)
    .eq('id', notificationId)

  if (error) throw error
}

export const markAllNotificationsRead = async ({
  organisationId,
  profileId,
}: {
  organisationId: string
  profileId: string
}) => {
  const { error } = await db
    .from('notifications')
    .update({ status: 'read' })
    .eq('organisation_id', organisationId)
    .eq('profile_id', profileId)
    .eq('status', 'unread')
    .is('deleted_at', null)

  if (error) throw error
}

export const fetchNotificationPreference = async ({
  organisationId,
  profileId,
}: {
  organisationId: string
  profileId: string
}): Promise<OpenKbNotificationPreference | null> => {
  const { data, error } = await db
    .from('user_notification_preferences')
    .select(notificationPreferenceSelect)
    .eq('organisation_id', organisationId)
    .eq('profile_id', profileId)
    .is('deleted_at', null)
    .maybeSingle()

  if (error) throw error

  return (data ?? null) as OpenKbNotificationPreference | null
}

export const setIssueNotificationsEnabled = async ({
  organisationId,
  profileId,
  enabled,
}: {
  organisationId: string
  profileId: string
  enabled: boolean
}): Promise<OpenKbNotificationPreference> => {
  const existing = await fetchNotificationPreference({ organisationId, profileId })
  const payload = {
    ...(existing?.payload ?? {}),
    issue_notifications_enabled: enabled,
  }

  if (existing) {
    const { data, error } = await db
      .from('user_notification_preferences')
      .update({
        payload,
        status: enabled ? 'active' : 'muted',
      })
      .eq('organisation_id', organisationId)
      .eq('id', existing.id)
      .select(notificationPreferenceSelect)
      .single()

    if (error) throw error

    return data as OpenKbNotificationPreference
  }

  const { data, error } = await db
    .from('user_notification_preferences')
    .insert({
      organisation_id: organisationId,
      profile_id: profileId,
      name: 'Default notification preferences',
      status: enabled ? 'active' : 'muted',
      payload,
    })
    .select(notificationPreferenceSelect)
    .single()

  if (error) throw error

  return data as OpenKbNotificationPreference
}
