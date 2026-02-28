import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render, screen, waitFor } from '@testing-library/react';
import { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const mockUseAuth = vi.fn();
const mockListAppPermissions = vi.fn();
const mockListOrgRoles = vi.fn();
const mockListMemberRoleAssignments = vi.fn();

vi.mock('@repo/shared/auth/context', () => ({
  useAuth: () => mockUseAuth(),
}));

vi.mock('../api/permissions', () => ({
  listAppPermissions: (...args: unknown[]) => mockListAppPermissions(...args),
  listOrgRoles: (...args: unknown[]) => mockListOrgRoles(...args),
  listMemberRoleAssignments: (...args: unknown[]) => mockListMemberRoleAssignments(...args),
}));

import { useAppPermissions, useMemberRoleAssignments, useOrgRoles } from '../hooks/queries/usePermissions';
import { DEMO_ORG_ID } from '../lib/demoData';

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
  it('uses demo data and skips API role calls in demo mode', async () => {
    mockUseAuth.mockReturnValue({ isDemoUser: true });
    mockListAppPermissions.mockResolvedValue([{ code: 'workflows.view', description: 'x' }]);

    render(<HookProbe orgId={DEMO_ORG_ID} />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(Number(screen.getByTestId('permissions-count').textContent)).toBeGreaterThan(0);
      expect(Number(screen.getByTestId('roles-count').textContent)).toBeGreaterThan(0);
      expect(Number(screen.getByTestId('assignments-count').textContent)).toBeGreaterThan(0);
    });

    expect(mockListOrgRoles).not.toHaveBeenCalled();
    expect(mockListMemberRoleAssignments).not.toHaveBeenCalled();
  });

  it('calls API for non-demo role and assignment queries', async () => {
    mockUseAuth.mockReturnValue({ isDemoUser: false });
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
    mockUseAuth.mockReturnValue({ isDemoUser: false });
    mockListAppPermissions.mockResolvedValue([{ code: 'executions.view', description: null }]);

    render(<HookProbe />, { wrapper: createWrapper() });

    await waitFor(() => {
      expect(screen.getByTestId('permissions-count').textContent).toBe('1');
    });

    expect(mockListOrgRoles).not.toHaveBeenCalled();
    expect(mockListMemberRoleAssignments).not.toHaveBeenCalled();
  });
});
