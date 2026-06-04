import { useEffect, useState } from 'react'
import { Button, Select, Toggle, useTheme } from '@repo/ui'
import { Save } from 'lucide-react'
import { AccountsAlert, AccountsField, AccountsPageShell, AccountsSection } from '../components/AccountsPageShell'
import {
  defaultAccountPreferences,
  getAccountPreferences,
  saveAccountPreferences,
  type AccountPreferences,
  type AccountThemePreference,
  type DefaultLandingApp,
} from '../api/preferences'

const timezoneOptions = ['Australia/Sydney', 'UTC', 'America/New_York', 'America/Los_Angeles', 'Europe/London', 'Europe/Berlin']
const localeOptions = ['en-AU', 'en-US', 'en-GB']

export const SettingsPage = () => {
  const { setTheme } = useTheme()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [preferences, setPreferences] = useState<AccountPreferences>(defaultAccountPreferences)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  useEffect(() => {
    const loadPreferences = async () => {
      try {
        setLoading(true)
        setError(null)
        const nextPreferences = await getAccountPreferences()
        setPreferences(nextPreferences)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load preferences.')
      } finally {
        setLoading(false)
      }
    }

    void loadPreferences()
  }, [])

  const updatePreference = <Key extends keyof AccountPreferences>(key: Key, value: AccountPreferences[Key]) => {
    setPreferences((previous) => ({ ...previous, [key]: value }))
    if (key === 'theme') {
      setTheme(value as AccountThemePreference)
    }
  }

  const handleSave = async () => {
    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const nextPreferences = await saveAccountPreferences(preferences)
      setPreferences(nextPreferences)
      setTheme(nextPreferences.theme)
      setSuccess('Settings saved.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to save settings.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccountsPageShell
      title="Settings"
      description="Set account defaults for appearance, notifications, locale, and launch behavior."
      loading={loading}
      loadingLabel="Loading settings..."
      alert={<AccountsAlert error={error} success={success} errorTitle="Settings update failed" />}
      actions={
        <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
          <Save className="h-4 w-4" />
          {saving ? 'Saving...' : 'Save settings'}
        </Button>
      }
    >
      <div className="grid gap-5 lg:grid-cols-2">
        <AccountsSection title="Appearance and region" description="Theme changes apply immediately and are persisted to the shared theme cookie.">
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="preferences-theme">Theme</label>
              <Select
                id="preferences-theme"
                value={preferences.theme}
                onChange={(event) => updatePreference('theme', event.target.value as AccountThemePreference)}
                options={[
                  { value: 'light', label: 'Light' },
                  { value: 'dark', label: 'Dark' },
                  { value: 'system', label: 'System' },
                ]}
              />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="preferences-timezone">Timezone</label>
                <Select
                  id="preferences-timezone"
                  value={preferences.timezone}
                  onChange={(event) => updatePreference('timezone', event.target.value)}
                  options={timezoneOptions.map((timezone) => ({ value: timezone, label: timezone }))}
                />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="preferences-locale">Locale</label>
                <Select
                  id="preferences-locale"
                  value={preferences.locale}
                  onChange={(event) => updatePreference('locale', event.target.value)}
                  options={localeOptions.map((locale) => ({ value: locale, label: locale }))}
                />
              </div>
            </div>
          </div>
        </AccountsSection>

        <AccountsSection title="Notifications">
          <div className="grid gap-3">
            <Toggle id="notify-product-updates" label="Product updates" checked={preferences.notifyProductUpdates} onChange={(event) => updatePreference('notifyProductUpdates', event.target.checked)} />
            <Toggle id="notify-security-alerts" label="Security alerts" checked={preferences.notifySecurityAlerts} onChange={(event) => updatePreference('notifySecurityAlerts', event.target.checked)} />
            <Toggle id="notify-billing-alerts" label="Billing alerts" checked={preferences.notifyBillingAlerts} onChange={(event) => updatePreference('notifyBillingAlerts', event.target.checked)} />
          </div>
        </AccountsSection>

        <AccountsSection title="Default landing app" description="Choose where the OpenSe app switcher should send you first.">
          <Select
            id="preferences-default-app"
            value={preferences.defaultLandingApp}
            onChange={(event) => updatePreference('defaultLandingApp', event.target.value as DefaultLandingApp)}
            options={[
              { value: 'accounts', label: 'Accounts' },
              { value: 'etl', label: 'ETL' },
              { value: 'stoqr', label: 'StoQR' },
            ]}
          />
        </AccountsSection>

        <AccountsSection title="Settings metadata">
          <dl className="grid gap-4">
            <AccountsField label="Last saved" value={preferences.updatedAt ? new Date(preferences.updatedAt).toLocaleString() : 'Not saved'} />
            <AccountsField label="Theme storage" value="Shared cookie and Supabase account preferences" />
          </dl>
        </AccountsSection>
      </div>
    </AccountsPageShell>
  )
}
