import { useOutletContext } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import {
  OrganisationPermissionsPanel,
  type OrganisationPermission,
  type OrganisationRole,
} from '@repo/ui';
import { createOrgRole, deleteOrgRole, updateOrgRole } from '../../api/permissions';
import { useAppPermissions, useOrgRoles } from '../../hooks/queries/usePermissions';
import { OrgSimple } from '../../types/organisation';

type OutletContextType = {
  currentOrg: OrgSimple | null;
  userRole: string | null;
};

export const PermissionsTab = () => {
  const { currentOrg, userRole } = useOutletContext<OutletContextType>();
  const queryClient = useQueryClient();
  const canManageRoles = userRole === 'owner' || userRole === 'admin';

  const { data: appPermissions = [], isLoading: permissionsLoading } = useAppPermissions();
  const { data: orgRoles = [], isLoading: rolesLoading } = useOrgRoles(currentOrg?.id);

  const refreshRoles = async () => {
    await queryClient.invalidateQueries({ queryKey: ['orgRoles', currentOrg?.id] });
    await queryClient.invalidateQueries({ queryKey: ['memberRoleAssignments', currentOrg?.id] });
  };

  if (!currentOrg) return null;

  return (
    <OrganisationPermissionsPanel
      title="Organisation Roles"
      description="Manage roles and their permissions."
      roles={orgRoles as OrganisationRole[]}
      permissions={appPermissions as OrganisationPermission[]}
      loadingRoles={rolesLoading}
      loadingPermissions={permissionsLoading}
      canManage={canManageRoles}
      isRoleEditable={(role) => role.name.trim().toLowerCase() !== 'owner'}
      onCreateRole={async ({ name, description, permissionCodes }) => {
        await createOrgRole(currentOrg.id, { name, description, permissionCodes });
        await refreshRoles();
      }}
      onUpdateRole={async (roleId, { name, description, permissionCodes }) => {
        await updateOrgRole(roleId, { name, description, permissionCodes });
        await refreshRoles();
      }}
      onDeleteRole={async (roleId) => {
        await deleteOrgRole(roleId);
        await refreshRoles();
      }}
    />
  );
};
