import {
  OrganisationPermissionsPanel,
  type OrganisationPermission,
  type OrganisationRole,
} from '@repo/ui'

type RolePayload = {
  name: string
  description: string
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
}: {
  roles: OrganisationRole[]
  permissions: OrganisationPermission[]
  loadingRoles?: boolean
  loadingPermissions?: boolean
  canManage: boolean
  onCreateRole: (payload: RolePayload) => Promise<void>
  onUpdateRole: (roleId: string, payload: RolePayload) => Promise<void>
}) => {
  return (
    <OrganisationPermissionsPanel
      title="Organisation Permissions"
      description="Manage StoQR roles and access permissions."
      roles={roles}
      permissions={permissions}
      loadingRoles={loadingRoles}
      loadingPermissions={loadingPermissions}
      canManage={canManage}
      onCreateRole={onCreateRole}
      onUpdateRole={onUpdateRole}
    />
  )
}
