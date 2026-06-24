import { Navigate, Outlet } from 'react-router-dom'
import { EmptyState } from '@repo/ui'
import { useOrganisation } from '../contexts/OrganisationContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'

export const PermissionRoute = ({ permission }: { permission: string }) => {
  const { organisationId } = useOrganisation()
  const { data: permissions = [], isLoading } = useMyPermissions(organisationId)

  if (isLoading) {
    return <EmptyState title="Loading access..." description="" />
  }

  if (!permissions.includes(permission)) {
    return <Navigate to="/dashboard" replace />
  }

  return <Outlet />
}
