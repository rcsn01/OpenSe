import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockSchema = vi.fn();

vi.mock('../lib/supabase', () => ({
  supabase: {
    schema: (...args: unknown[]) => mockSchema(...args),
  },
}));

import {
  createOrgRole,
  deleteOrgRole,
  listAppPermissions,
  listMemberRoleAssignments,
  listOrgRoles,
  updateOrgRole,
  upsertMemberRoleAssignment,
} from '../api/permissions';

beforeEach(() => {
  vi.clearAllMocks();
});

describe('permissions api', () => {
  it('lists app permissions from etl schema', async () => {
    const order = vi.fn().mockResolvedValue({
      data: [{ code: 'workflows.view', description: 'View ETL workflows' }],
      error: null,
    });
    const select = vi.fn(() => ({ order }));
    const from = vi.fn(() => ({ select }));

    mockSchema.mockReturnValue({ from });

    const result = await listAppPermissions();

    expect(mockSchema).toHaveBeenCalledWith('etl');
    expect(from).toHaveBeenCalledWith('app_permissions');
    expect(select).toHaveBeenCalledWith('code, description');
    expect(order).toHaveBeenCalledWith('code', { ascending: true });
    expect(result).toEqual([{ code: 'workflows.view', description: 'View ETL workflows' }]);
  });

  it('creates org role and inserts permissions', async () => {
    const roleSingle = vi.fn().mockResolvedValue({ data: { id: 'role-1' }, error: null });
    const roleSelect = vi.fn(() => ({ single: roleSingle }));
    const roleInsert = vi.fn(() => ({ select: roleSelect }));

    const permInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === 'roles') {
        return { insert: roleInsert };
      }
      if (table === 'role_permissions') {
        return { insert: permInsert };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mockSchema.mockReturnValue({ from });

    const roleId = await createOrgRole('org-1', {
      name: 'Operator',
      description: 'Can run workflows',
      permissionCodes: ['workflows.view', 'executions.run'],
    });

    expect(roleId).toBe('role-1');
    expect(roleInsert).toHaveBeenCalledWith({
      org_id: 'org-1',
      name: 'Operator',
      description: 'Can run workflows',
    });
    expect(permInsert).toHaveBeenCalledWith([
      { role_id: 'role-1', permission_code: 'workflows.view' },
      { role_id: 'role-1', permission_code: 'executions.run' },
    ]);
  });

  it('updates role and replaces role permissions', async () => {
    const roleEq = vi.fn().mockResolvedValue({ error: null });
    const roleUpdate = vi.fn(() => ({ eq: roleEq }));

    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const permissionsDelete = vi.fn(() => ({ eq: deleteEq }));

    const permissionsInsert = vi.fn().mockResolvedValue({ error: null });

    const from = vi.fn((table: string) => {
      if (table === 'roles') {
        return { update: roleUpdate };
      }
      if (table === 'role_permissions') {
        return {
          delete: permissionsDelete,
          insert: permissionsInsert,
        };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mockSchema.mockReturnValue({ from });

    await updateOrgRole('role-2', {
      name: 'Reviewer',
      description: 'Read only role',
      permissionCodes: ['workflows.view'],
    });

    expect(roleUpdate).toHaveBeenCalledWith({ name: 'Reviewer', description: 'Read only role' });
    expect(roleEq).toHaveBeenCalledWith('id', 'role-2');
    expect(permissionsDelete).toHaveBeenCalled();
    expect(deleteEq).toHaveBeenCalledWith('role_id', 'role-2');
    expect(permissionsInsert).toHaveBeenCalledWith([{ role_id: 'role-2', permission_code: 'workflows.view' }]);
  });

  it('lists org roles and assignment joins and supports delete role', async () => {
    const rolesOrder = vi.fn().mockResolvedValue({
      data: [
        {
          id: 'role-3',
          org_id: 'org-1',
          name: 'Analyst',
          description: null,
          role_permissions: [{ permission_code: 'workflows.view' }],
        },
      ],
      error: null,
    });
    const rolesEq = vi.fn(() => ({ order: rolesOrder }));
    const rolesSelect = vi.fn(() => ({ eq: rolesEq }));

    const assignEq = vi.fn().mockResolvedValue({
      data: [
        {
          org_member_id: 'member-1',
          role_id: 'role-3',
          roles: [{ name: 'Analyst' }],
        },
      ],
      error: null,
    });
    const assignSelect = vi.fn(() => ({ eq: assignEq }));

    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const deleteFn = vi.fn(() => ({ eq: deleteEq }));

    const from = vi.fn((table: string) => {
      if (table === 'roles') {
        return {
          select: rolesSelect,
          delete: deleteFn,
        };
      }
      if (table === 'organisation_member_roles') {
        return { select: assignSelect };
      }
      throw new Error(`Unexpected table ${table}`);
    });

    mockSchema.mockReturnValue({ from });

    const roles = await listOrgRoles('org-1');
    const assignments = await listMemberRoleAssignments('org-1');
    await deleteOrgRole('role-3');

    expect(roles).toEqual([
      {
        id: 'role-3',
        org_id: 'org-1',
        name: 'Analyst',
        description: null,
        permissionCodes: ['workflows.view'],
      },
    ]);
    expect(assignments).toEqual([
      {
        org_member_id: 'member-1',
        role_id: 'role-3',
        role_name: 'Analyst',
      },
    ]);
    expect(deleteEq).toHaveBeenCalledWith('id', 'role-3');
  });

  it('upserts and clears member custom role assignments', async () => {
    const upsert = vi.fn().mockResolvedValue({ error: null });
    const deleteEq = vi.fn().mockResolvedValue({ error: null });
    const remove = vi.fn(() => ({ eq: deleteEq }));

    const from = vi.fn(() => ({
      upsert,
      delete: remove,
    }));

    mockSchema.mockReturnValue({ from });

    await upsertMemberRoleAssignment('member-1', 'role-1');
    await upsertMemberRoleAssignment('member-1', null);

    expect(upsert).toHaveBeenCalledWith(
      {
        org_member_id: 'member-1',
        role_id: 'role-1',
      },
      { onConflict: 'org_member_id' },
    );
    expect(deleteEq).toHaveBeenCalledWith('org_member_id', 'member-1');
  });
});
