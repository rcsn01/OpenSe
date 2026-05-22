import { Navigate, Outlet } from 'react-router-dom'
import { EmptyState } from '@repo/ui'
import { useCompany } from '../contexts/CompanyContext'
import { useMyPermissions } from '../hooks/queries/usePermissions'

export const useHasPermission = (permissionCode: string) => {
  const { companyId } = useCompany()
  const { data: permissions = [], isLoading } = useMyPermissions(companyId)

  return {
    hasPermission: permissions.includes(permissionCode),
    isLoading,
  }
}

export const PermissionRoute = ({
  permission,
  redirectTo,
}: {
  permission: string
  redirectTo?: string
}) => {
  const { companyId } = useCompany()
  const { data: permissions = [], isLoading } = useMyPermissions(companyId)

  if (isLoading) {
    return <EmptyState title="Loading access..." description="" />
  }

  if (!permissions.includes(permission)) {
    if (redirectTo) {
      return <Navigate to={redirectTo} replace />
    }

    return (
      <EmptyState
        title="No access"
        description="Your role does not include permission to open this page."
      />
    )
  }

  return <Outlet />
}
