import { supabase } from '@repo/shared/supabase'
import {
  firstPartyLandingAppCodes,
  isLandingAppCode,
  type LandingAppCode,
} from '@repo/shared/app-registry'

export type AccountThemePreference = 'light' | 'dark' | 'system'
export type DefaultLandingApp = LandingAppCode

export const defaultLandingApps = ['accounts', ...firstPartyLandingAppCodes] as const

const isDefaultLandingApp = (value: string | null | undefined): value is DefaultLandingApp =>
  isLandingAppCode(value)

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
    defaultLandingApp: isDefaultLandingApp(row?.default_landing_app)
      ? row.default_landing_app
      : defaultAccountPreferences.defaultLandingApp,
    updatedAt: row?.updated_at ?? null,
  }
}

export const getAccountPreferences = async (): Promise<AccountPreferences> => {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('account_preferences')
    .select('theme, timezone, locale, notification_preferences, default_landing_app, updated_at')
    .eq('user_id', userId)
    .maybeSingle()
  if (error) throw error
  const row = data as AccountPreferencesRow | null
  return mapPreferences(row ?? undefined)
}

export const saveAccountPreferences = async (preferences: AccountPreferences): Promise<AccountPreferences> => {
  const { data: userData, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError
  const userId = userData.user?.id
  if (!userId) throw new Error('Not authenticated')

  const { data, error } = await supabase
    .from('account_preferences')
    .upsert({
      user_id: userId,
      theme: preferences.theme,
      timezone: preferences.timezone || 'UTC',
      locale: preferences.locale || 'en-AU',
      notification_preferences: {
        product_updates: preferences.notifyProductUpdates,
        security_alerts: preferences.notifySecurityAlerts,
        billing_alerts: preferences.notifyBillingAlerts,
      },
      default_landing_app: preferences.defaultLandingApp,
    }, { onConflict: 'user_id' })
    .select('theme, timezone, locale, notification_preferences, default_landing_app, updated_at')
    .single()
  if (error) throw error

  const row = data as AccountPreferencesRow | null
  return mapPreferences(row ?? undefined)
}
