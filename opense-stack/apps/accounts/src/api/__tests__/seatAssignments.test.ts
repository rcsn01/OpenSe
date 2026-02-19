import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@repo/shared/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import {
  assignSeat,
  getSeatAssignmentSnapshot,
  unassignSeat,
} from '../seatAssignments'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('seatAssignments api', () => {
  it('builds seat assignment snapshot and filters unsupported app codes', async () => {
    mockRpc
      .mockResolvedValueOnce({
        data: [{ org_id: 'org-1' }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [
          {
            org_member_id: 'member-1',
            user_id: 'user-1',
            full_name: 'Alice',
            email: 'alice@example.com',
            role: 'admin',
            assigned_apps: ['etl', 'unknown', 'stoqr'],
          },
        ],
        error: null,
      })

    const snapshot = await getSeatAssignmentSnapshot()

    expect(snapshot).toEqual({
      orgId: 'org-1',
      members: [
        {
          orgMemberId: 'member-1',
          userId: 'user-1',
          fullName: 'Alice',
          email: 'alice@example.com',
          role: 'admin',
          assignedApps: ['etl', 'stoqr'],
        },
      ],
    })

    expect(mockRpc).toHaveBeenNthCalledWith(1, 'accounts_get_my_org_context')
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'accounts_get_org_member_app_assignments')
  })

  it('throws when no membership context exists', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [],
      error: null,
    })

    await expect(getSeatAssignmentSnapshot()).rejects.toThrow(
      'No organisation membership found for the current user.',
    )
  })

  it('assignSeat calls RPC with expected payload', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await assignSeat('member-1', 'etl')

    expect(mockRpc).toHaveBeenCalledWith('accounts_assign_org_member_app_seat', {
      p_org_member_id: 'member-1',
      p_app_code: 'etl',
    })
  })

  it('unassignSeat calls RPC with expected payload', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await unassignSeat('member-1', 'stoqr')

    expect(mockRpc).toHaveBeenCalledWith('accounts_unassign_org_member_app_seat', {
      p_org_member_id: 'member-1',
      p_app_code: 'stoqr',
    })
  })

  it('propagates RPC errors from seat assignment operations', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'rpc failed' } })

    await expect(assignSeat('member-1', 'etl')).rejects.toMatchObject({ message: 'rpc failed' })
  })
})
