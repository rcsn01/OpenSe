import { useQuery } from '@tanstack/react-query';
import { useAuth } from '@repo/shared/auth/context';
import { listAppPermissions, listMemberRoleAssignments, listOrgRoles } from '../../api/permissions';
import { mockAppPermissions, mockMemberRoleAssignments, mockOrgRoles, DEMO_ORG_ID } from '../../lib/demoData';
import { permissionKeys } from './queryKeys';
import { AppPermission, MemberRoleAssignment, OrgRole } from '../../types/permissions';

export const useAppPermissions = () => {
  const { isDemoUser } = useAuth();

  return useQuery<AppPermission[]>({
    queryKey: permissionKeys.appPermissions(Boolean(isDemoUser)),
    queryFn: () => {
      if (isDemoUser) return mockAppPermissions;
      return listAppPermissions();
    },
    staleTime: 1000 * 60 * 10,
  });
};

export const useOrgRoles = (orgId: string | undefined) => {
  const { isDemoUser } = useAuth();

  return useQuery<OrgRole[]>({
    queryKey: permissionKeys.orgRoles(orgId, Boolean(isDemoUser)),
    queryFn: () => {
      if (isDemoUser && orgId === DEMO_ORG_ID) return mockOrgRoles;
      return orgId ? listOrgRoles(orgId) : [];
    },
    enabled: !!orgId,
  });
};

export const useMemberRoleAssignments = (orgId: string | undefined) => {
  const { isDemoUser } = useAuth();

  return useQuery<MemberRoleAssignment[]>({
    queryKey: permissionKeys.memberRoleAssignments(orgId, Boolean(isDemoUser)),
    queryFn: () => {
      if (isDemoUser && orgId === DEMO_ORG_ID) return mockMemberRoleAssignments;
      return orgId ? listMemberRoleAssignments(orgId) : [];
    },
    enabled: !!orgId,
  });
};
