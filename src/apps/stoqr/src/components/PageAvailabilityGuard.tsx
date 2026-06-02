import type { ReactNode } from 'react'
import { EmptyState } from '@repo/ui'
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
    return <EmptyState title="Loading page availability..." description="" />
  }

  if (!isOrganisationPageFeatureEnabled(data, feature)) {
    return (
      <div role="status">
        <EmptyState title={FEATURE_UNAVAILABLE_MESSAGE} description="" />
      </div>
    )
  }

  return <>{children}</>
}
