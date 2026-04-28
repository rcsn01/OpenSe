import { db } from '../supabaseClient'

export type OrganisationPageFeature = 'reports' | 'procurement' | 'alerts'

export type OrganisationPageSettings = {
  reportsEnabled: boolean
  procurementEnabled: boolean
  alertsEnabled: boolean
}

type OrganisationPageSettingsRow = {
  reports_enabled: boolean | null
  procurement_enabled: boolean | null
  alerts_enabled: boolean | null
}

export const defaultOrganisationPageSettings: OrganisationPageSettings = {
  reportsEnabled: true,
  procurementEnabled: true,
  alertsEnabled: true,
}

export const organisationPageFeatureLabels: Record<OrganisationPageFeature, string> = {
  reports: 'Reports',
  procurement: 'Procurement',
  alerts: 'Alerts',
}

const mapRowToSettings = (
  row: OrganisationPageSettingsRow | null | undefined,
): OrganisationPageSettings => ({
  reportsEnabled: row?.reports_enabled ?? true,
  procurementEnabled: row?.procurement_enabled ?? true,
  alertsEnabled: row?.alerts_enabled ?? true,
})

export const isOrganisationPageFeatureEnabled = (
  settings: OrganisationPageSettings | null | undefined,
  feature: OrganisationPageFeature,
) => {
  const resolvedSettings = settings ?? defaultOrganisationPageSettings

  switch (feature) {
    case 'reports':
      return resolvedSettings.reportsEnabled
    case 'procurement':
      return resolvedSettings.procurementEnabled
    case 'alerts':
      return resolvedSettings.alertsEnabled
  }
}

export const setOrganisationPageFeatureEnabled = (
  settings: OrganisationPageSettings,
  feature: OrganisationPageFeature,
  enabled: boolean,
): OrganisationPageSettings => {
  switch (feature) {
    case 'reports':
      return { ...settings, reportsEnabled: enabled }
    case 'procurement':
      return { ...settings, procurementEnabled: enabled }
    case 'alerts':
      return { ...settings, alertsEnabled: enabled }
  }
}

export const fetchOrganisationPageSettings = async (
  companyId: string,
): Promise<OrganisationPageSettings> => {
  const { data, error } = await db
    .from('organisation_page_settings')
    .select('reports_enabled, procurement_enabled, alerts_enabled')
    .eq('company_id', companyId)
    .maybeSingle<OrganisationPageSettingsRow>()

  if (error) throw error

  return mapRowToSettings(data)
}

export const updateOrganisationPageSettings = async (
  companyId: string,
  settings: OrganisationPageSettings,
): Promise<OrganisationPageSettings> => {
  const { data, error } = await db
    .from('organisation_page_settings')
    .upsert(
      {
        company_id: companyId,
        reports_enabled: settings.reportsEnabled,
        procurement_enabled: settings.procurementEnabled,
        alerts_enabled: settings.alertsEnabled,
      },
      { onConflict: 'company_id' },
    )
    .select('reports_enabled, procurement_enabled, alerts_enabled')
    .single<OrganisationPageSettingsRow>()

  if (error) throw error

  return mapRowToSettings(data)
}