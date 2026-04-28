import type { ReactNode } from 'react'
import {
  isOrganisationPageFeatureEnabled,
  type OrganisationPageFeature,
} from '../api/organisationPageSettings'
import { useOrganisationPageSettings } from '../hooks/queries/useOrganisationPageSettings'

export const FEATURE_UNAVAILABLE_MESSAGE =
  'Feature unavailable, please contact your admin for assistance.'

export const PageAvailabilityGuard = ({
  companyId,
  feature,
  children,
}: {
  companyId: string | null
  feature: OrganisationPageFeature
  children: ReactNode
}) => {
  const { data, isLoading } = useOrganisationPageSettings(companyId)

  if (!companyId) {
    return <>{children}</>
  }

  if (isLoading) {
    return <div className="empty-state">Loading page availability...</div>
  }

  if (!isOrganisationPageFeatureEnabled(data, feature)) {
    return (
      <div className="empty-state" role="status">
        <h3 style={{ margin: 0 }}>{FEATURE_UNAVAILABLE_MESSAGE}</h3>
      </div>
    )
  }

  return <>{children}</>
}