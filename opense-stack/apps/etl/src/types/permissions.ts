export type AppPermission = {
  code: string;
  description: string | null;
};

export type OrgRole = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  permissionCodes: string[];
};

export type MemberRoleAssignment = {
  org_member_id: string;
  role_id: string | null;
  role_name: string | null;
};
