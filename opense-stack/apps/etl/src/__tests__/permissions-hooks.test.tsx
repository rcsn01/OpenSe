import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockListAppPermissions = vi.fn();
const mockListOrgRoles = vi.fn();
const mockListMemberRoleAssignments = vi.fn();

vi.mock('../api/permissions', () => ({
  listAppPermissions: (...args: unknown[]) => mockListAppPermissions(...args),
  listOrgRoles: (...args: unknown[]) => mockListOrgRoles(...args),
  listMemberRoleAssignments: (...args: unknown[]) => mockListMemberRoleAssignments(...args),
}));

import { useAppPermissions, useMemberRoleAssignments, useOrgRoles } from '../hooks/queries/usePermissions';

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
        gcTime: 0,
      },
    },
  });

  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

const HookProbe = ({ orgId }: { orgId?: string }) => {
  const appPermissions = useAppPermissions();
  const roles = useOrgRoles(orgId);
  const assignments = useMemberRoleAssignments(orgId);

  return (
    <div>
      <div data-testid="permissions-count">{(appPermissions.data ?? []).length}</div>
      <div data-testid="roles-count">{(roles.data ?? []).length}</div>
      <div data-testid="assignments-count">{(assignments.data ?? []).length}</div>
    </div>
  );
};

beforeEach(() => {
  vi.clearAllMocks();
});

describe('permissions hooks', () => {
  it('calls API for permission, role, and assignment queries', async () => {
    mockListAppPermissions.mockResolvedValue([{ code: 'executions.view', description: null }]);
    mockListOrgRoles.mockResolvedValue([{ id: 'role-1', name: 'Operator', permissionCodes: [] }]);
    mockListMemberRoleAssignments.mockResolvedValue([{ org_member_id: 'member-1', role_id: 'role-1', role_name: 'Operator' }]);

    render(<HookProbe orgId="org-1" />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('permissions-count').textContent).toBe('1');
      expect(screen.getByTestId('roles-count').textContent).toBe('1');
      expect(screen.getByTestId('assignments-count').textContent).toBe('1');
    });

    expect(mockListOrgRoles).toHaveBeenCalledWith('org-1');
    expect(mockListMemberRoleAssignments).toHaveBeenCalledWith('org-1');
  });

  it('does not call role assignment APIs when orgId is missing', async () => {
    mockListAppPermissions.mockResolvedValue([{ code: 'executions.view', description: null }]);

    render(<HookProbe />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('permissions-count').textContent).toBe('1');
    });

    expect(mockListOrgRoles).not.toHaveBeenCalled();
    expect(mockListMemberRoleAssignments).not.toHaveBeenCalled();
  });
});
