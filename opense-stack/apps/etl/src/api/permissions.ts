import { supabase } from '../lib/supabase';
import { AppPermission, MemberRoleAssignment, OrgRole } from '../types/permissions';

type RolePermissionRow = {
  permission_code: string;
};

type RoleRow = {
  id: string;
  org_id: string;
  name: string;
  description: string | null;
  role_permissions?: RolePermissionRow[];
};

export const listAppPermissions = async (): Promise<AppPermission[]> => {
  const { data, error } = await supabase
    .schema('etl')
    .from('app_permissions')
    .select('code, description')
    .order('code', { ascending: true });

  if (error) throw error;
  return (data ?? []) as AppPermission[];
};

export const listOrgRoles = async (orgId: string): Promise<OrgRole[]> => {
  const { data, error } = await supabase
    .schema('etl')
    .from('roles')
    .select('id, org_id, name, description, role_permissions(permission_code)')
    .eq('org_id', orgId)
    .order('name', { ascending: true });

  if (error) throw error;

  return ((data ?? []) as RoleRow[]).map((row) => ({
    id: row.id,
    org_id: row.org_id,
    name: row.name,
    description: row.description,
    permissionCodes: (row.role_permissions ?? []).map((permission) => permission.permission_code),
  }));
};

export const createOrgRole = async (
  orgId: string,
  payload: { name: string; description?: string; permissionCodes: string[] },
) => {
  const { data: role, error: roleError } = await supabase
    .schema('etl')
    .from('roles')
    .insert({
      org_id: orgId,
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
    })
    .select('id')
    .single();

  if (roleError) throw roleError;

  if (payload.permissionCodes.length > 0) {
    const { error: permissionsError } = await supabase
      .schema('etl')
      .from('role_permissions')
      .insert(
        payload.permissionCodes.map((permissionCode) => ({
          role_id: role.id,
          permission_code: permissionCode,
        })),
      );

    if (permissionsError) throw permissionsError;
  }

  return role.id as string;
};

export const updateOrgRole = async (
  roleId: string,
  payload: { name: string; description?: string; permissionCodes: string[] },
) => {
  const { error: roleError } = await supabase
    .schema('etl')
    .from('roles')
    .update({
      name: payload.name.trim(),
      description: payload.description?.trim() || null,
    })
    .eq('id', roleId);

  if (roleError) throw roleError;

  const { error: deleteError } = await supabase
    .schema('etl')
    .from('role_permissions')
    .delete()
    .eq('role_id', roleId);

  if (deleteError) throw deleteError;

  if (payload.permissionCodes.length > 0) {
    const { error: insertError } = await supabase
      .schema('etl')
      .from('role_permissions')
      .insert(
        payload.permissionCodes.map((permissionCode) => ({
          role_id: roleId,
          permission_code: permissionCode,
        })),
      );

    if (insertError) throw insertError;
  }
};

export const deleteOrgRole = async (roleId: string) => {
  const { error } = await supabase
    .schema('etl')
    .from('roles')
    .delete()
    .eq('id', roleId);

  if (error) throw error;
};

export const listMemberRoleAssignments = async (orgId: string): Promise<MemberRoleAssignment[]> => {
  const { data, error } = await supabase
    .schema('etl')
    .from('organisation_member_roles')
    .select('org_member_id, role_id, roles(name), organisation_members!inner(org_id)')
    .eq('organisation_members.org_id', orgId);

  if (error) throw error;

  return (data ?? []).map((row: any) => ({
    org_member_id: row.org_member_id,
    role_id: row.role_id,
    role_name: Array.isArray(row.roles) ? row.roles[0]?.name ?? null : row.roles?.name ?? null,
  }));
};

export const upsertMemberRoleAssignment = async (orgMemberId: string, roleId: string | null) => {
  if (!roleId) {
    const { error: deleteError } = await supabase
      .schema('etl')
      .from('organisation_member_roles')
      .delete()
      .eq('org_member_id', orgMemberId);

    if (deleteError) throw deleteError;
    return;
  }

  const { error } = await supabase
    .schema('etl')
    .from('organisation_member_roles')
    .upsert(
      {
        org_member_id: orgMemberId,
        role_id: roleId,
      },
      {
        onConflict: 'org_member_id',
      },
    );

  if (error) throw error;
};
