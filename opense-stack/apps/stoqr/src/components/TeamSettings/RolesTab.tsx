import { useMemo } from 'react'
import {
  OrganisationPermissionsPanel,
  type OrganisationPermission,
  type OrganisationRole,
} from '@repo/ui'
import { fuzzyRankings, fuzzySearchItems } from '../../lib/pageSearch'

type RolePayload = {
  name: string
  description: string
  roleRank: number
  permissionCodes: string[]
}

export const RolesTab = ({
  roles,
  permissions,
  loadingRoles,
  loadingPermissions,
  canManage,
  onCreateRole,
  onUpdateRole,
  searchTerm = '',
}: {
  roles: OrganisationRole[]
  permissions: OrganisationPermission[]
  loadingRoles?: boolean
  loadingPermissions?: boolean
  canManage: boolean
  onCreateRole: (payload: RolePayload) => Promise<void>
  onUpdateRole: (roleId: string, payload: RolePayload) => Promise<void>
  searchTerm?: string
}) => {
  const filteredRoles = useMemo(
    () => fuzzySearchItems(roles, searchTerm, [
      {
        key: (role) => role.name,
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (role) => role.description ?? '',
        maxRanking: fuzzyRankings.CONTAINS,
      },
      {
        key: (role) => role.permissionCodes,
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]),
    [roles, searchTerm],
  )

  const filteredPermissions = useMemo(
    () => fuzzySearchItems(permissions, searchTerm, [
      {
        key: (permission) => permission.code,
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (permission) => permission.description ?? '',
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]),
    [permissions, searchTerm],
  )

  return (
    <OrganisationPermissionsPanel
      title="Organisation Permissions"
      description="Manage StoQR roles and access permissions."
      roles={filteredRoles}
      permissions={filteredPermissions}
      loadingRoles={loadingRoles}
      loadingPermissions={loadingPermissions}
      canManage={canManage}
      isRoleEditable={(role) => role.name.trim().toLowerCase() !== 'owner'}
      onCreateRole={onCreateRole}
      onUpdateRole={onUpdateRole}
    />
  )
}
