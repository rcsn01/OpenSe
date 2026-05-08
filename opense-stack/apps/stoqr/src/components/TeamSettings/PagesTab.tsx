import { Bell, FileText, Truck } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { Card, Toggle } from '@repo/ui'
import {
  organisationPageFeatureLabels,
  type OrganisationPageFeature,
  type OrganisationPageSettings,
} from '../../api/organisationPageSettings'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'

type PagesTabProps = {
  settings: OrganisationPageSettings
  isLoading: boolean
  isUpdating: boolean
  onToggle: (feature: OrganisationPageFeature, enabled: boolean) => Promise<void>
  searchTerm?: string
}

const pageRows: Array<{
  feature: OrganisationPageFeature
  description: string
  icon: typeof FileText
  accentClassName: string
}> = [
  {
    feature: 'reports',
    description: 'Control access to analytics, exports, and saved reports across the organisation.',
    icon: FileText,
    accentClassName: 'bg-[var(--color-info-light)] text-[var(--color-info)]',
  },
  {
    feature: 'procurement',
    description: 'Control access to purchase orders, suppliers, and receiving workflows for every member.',
    icon: Truck,
    accentClassName: 'bg-[var(--color-warning-light)] text-[var(--color-warning)]',
  },
  {
    feature: 'alerts',
    description: 'Control access to alert feeds, rules, and organisation-wide alert management.',
    icon: Bell,
    accentClassName: 'bg-[var(--color-success-light)] text-[var(--color-success)]',
  },
]

const isFeatureEnabled = (
  settings: OrganisationPageSettings,
  feature: OrganisationPageFeature,
) => {
  switch (feature) {
    case 'reports':
      return settings.reportsEnabled
    case 'procurement':
      return settings.procurementEnabled
    case 'alerts':
      return settings.alertsEnabled
  }
}

export const PagesTab = ({
  settings,
  isLoading,
  isUpdating,
  onToggle,
  searchTerm = '',
}: PagesTabProps) => {
  const [draft, setDraft] = useState(settings)
  const [pendingFeature, setPendingFeature] =
    useState<OrganisationPageFeature | null>(null)
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)

  useEffect(() => {
    setDraft(settings)
  }, [settings])

  const filteredPageRows = useMemo(
    () => fuzzySearchItems(pageRows, normalizedSearchTerm, [
      {
        key: (row) => organisationPageFeatureLabels[row.feature],
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (row) => row.description,
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]),
    [normalizedSearchTerm],
  )

  const handleToggle = async (
    feature: OrganisationPageFeature,
    enabled: boolean,
  ) => {
    const previous = draft
    const next: OrganisationPageSettings = {
      ...draft,
      ...(feature === 'reports' ? { reportsEnabled: enabled } : {}),
      ...(feature === 'procurement' ? { procurementEnabled: enabled } : {}),
      ...(feature === 'alerts' ? { alertsEnabled: enabled } : {}),
    }

    setDraft(next)
    setPendingFeature(feature)

    try {
      await onToggle(feature, enabled)
    } catch {
      setDraft(previous)
    } finally {
      setPendingFeature(null)
    }
  }

  if (isLoading) {
    return <div className="empty-state">Loading page access controls...</div>
  }

  return (
    <Card className="overflow-hidden" padding="none">
      <div className="border-b border-[var(--color-border)] px-6 py-5">
        <h2 className="text-lg font-semibold text-[var(--color-foreground)]">
          Page Access
        </h2>
        <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
          Turn StoQR sections on or off for everyone in this organisation.
        </p>
      </div>

      <div className="divide-y divide-[var(--color-border)]">
        {filteredPageRows.length === 0 ? (
          <div className="px-6 py-10 text-sm text-[var(--color-muted-foreground)]">
            No organisation pages matched "{normalizedSearchTerm}".
          </div>
        ) : filteredPageRows.map(({ feature, description, icon: Icon, accentClassName }) => (
          <div key={feature} className="flex items-center justify-between gap-4 px-6 py-5">
            <div className="flex items-start gap-3">
              <div className={`rounded-xl p-3 ${accentClassName}`}>
                <Icon size={18} aria-hidden="true" />
              </div>

              <div>
                <h3 className="text-sm font-semibold text-[var(--color-foreground)]">
                  {organisationPageFeatureLabels[feature]}
                </h3>
                <p className="mt-1 text-sm text-[var(--color-muted-foreground)]">
                  {description}
                </p>
                {pendingFeature === feature ? (
                  <p className="mt-2 text-xs text-[var(--color-muted-foreground)]">
                    Saving {organisationPageFeatureLabels[feature].toLowerCase()} availability...
                  </p>
                ) : null}
              </div>
            </div>

            <Toggle
              checked={isFeatureEnabled(draft, feature)}
              disabled={isUpdating}
              onChange={(event) =>
                void handleToggle(feature, event.target.checked)
              }
              aria-label={`Toggle ${organisationPageFeatureLabels[feature]} page`}
            />
          </div>
        ))}
      </div>
    </Card>
  )
}
