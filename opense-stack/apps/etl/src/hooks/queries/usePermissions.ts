import { useQuery } from '@tanstack/react-query';
import { listAppPermissions, listMemberRoleAssignments, listOrgRoles } from '../../api/permissions';
import { permissionKeys } from './queryKeys';
import { AppPermission, MemberRoleAssignment, OrgRole } from '../../types/permissions';

export const useAppPermissions = () => {
  return useQuery<AppPermission[]>({
    queryKey: permissionKeys.appPermissions(),
    queryFn: () => listAppPermissions(),
    staleTime: 1000 * 60 * 10,
  });
};

export const useOrgRoles = (orgId: string | undefined) => {
  return useQuery<OrgRole[]>({
    queryKey: permissionKeys.orgRoles(orgId),
    queryFn: () => (orgId ? listOrgRoles(orgId) : []),
    enabled: !!orgId,
  });
};

export const useMemberRoleAssignments = (orgId: string | undefined) => {
  return useQuery<MemberRoleAssignment[]>({
    queryKey: permissionKeys.memberRoleAssignments(orgId),
    queryFn: () => (orgId ? listMemberRoleAssignments(orgId) : []),
    enabled: !!orgId,
  });
};
