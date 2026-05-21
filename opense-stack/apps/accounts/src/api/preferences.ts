import { supabase } from '@repo/shared/supabase'

export type AccountThemePreference = 'light' | 'dark' | 'system'
export type DefaultLandingApp = 'accounts' | 'etl' | 'stoqr' | 'admin'

export interface AccountPreferences {
  theme: AccountThemePreference
  timezone: string
  locale: string
  notifyProductUpdates: boolean
  notifySecurityAlerts: boolean
  notifyBillingAlerts: boolean
  defaultLandingApp: DefaultLandingApp
  updatedAt: string | null
}

interface AccountPreferencesRow {
  theme: AccountThemePreference | null
  timezone: string | null
  locale: string | null
  notification_preferences: Record<string, unknown> | null
  default_landing_app: DefaultLandingApp | null
  updated_at: string | null
}

export const defaultAccountPreferences: AccountPreferences = {
  theme: 'light',
  timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  locale: navigator.language || 'en-AU',
  notifyProductUpdates: true,
  notifySecurityAlerts: true,
  notifyBillingAlerts: true,
  defaultLandingApp: 'accounts',
  updatedAt: null,
}

const mapPreferences = (row: AccountPreferencesRow | undefined): AccountPreferences => {
  const notifications = row?.notification_preferences ?? {}
  return {
    theme: row?.theme ?? defaultAccountPreferences.theme,
    timezone: row?.timezone ?? defaultAccountPreferences.timezone,
    locale: row?.locale ?? defaultAccountPreferences.locale,
    notifyProductUpdates: notifications.product_updates !== false,
    notifySecurityAlerts: notifications.security_alerts !== false,
    notifyBillingAlerts: notifications.billing_alerts !== false,
    defaultLandingApp: row?.default_landing_app ?? defaultAccountPreferences.defaultLandingApp,
    updatedAt: row?.updated_at ?? null,
  }
}

export const getAccountPreferences = async (): Promise<AccountPreferences> => {
  const { data, error } = await supabase.rpc('accounts_get_preferences')
  if (error) throw error
  const row = Array.isArray(data) ? (data[0] as AccountPreferencesRow | undefined) : undefined
  return mapPreferences(row)
}

export const saveAccountPreferences = async (preferences: AccountPreferences): Promise<AccountPreferences> => {
  const { data, error } = await supabase.rpc('accounts_upsert_preferences', {
    p_theme: preferences.theme,
    p_timezone: preferences.timezone,
    p_locale: preferences.locale,
    p_notification_preferences: {
      product_updates: preferences.notifyProductUpdates,
      security_alerts: preferences.notifySecurityAlerts,
      billing_alerts: preferences.notifyBillingAlerts,
    },
    p_default_landing_app: preferences.defaultLandingApp,
  })
  if (error) throw error

  const row = Array.isArray(data) ? (data[0] as AccountPreferencesRow | undefined) : undefined
  return mapPreferences(row)
}
