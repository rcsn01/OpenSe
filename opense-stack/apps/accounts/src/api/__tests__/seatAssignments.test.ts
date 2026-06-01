import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()
const mockGetOrganisationInvitesForOrg = vi.fn()
const mockInviteOrganisationMember = vi.fn()
const mockCancelOrganisationInviteForOrg = vi.fn()

vi.mock('@repo/shared/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

vi.mock('@repo/shared/organisation-invites', () => ({
  cancelOrganisationInviteForOrg: (...args: unknown[]) => mockCancelOrganisationInviteForOrg(...args),
  getOrganisationInvitesForOrg: (...args: unknown[]) => mockGetOrganisationInvitesForOrg(...args),
  inviteOrganisationMember: (...args: unknown[]) => mockInviteOrganisationMember(...args),
}))

import {
  assignInviteSeat,
  assignSeat,
  cancelSeatInvite,
  getSeatAssignmentSnapshot,
  inviteSeatMembers,
  unassignInviteSeat,
  unassignSeat,
} from '../seatAssignments'

beforeEach(() => {
  vi.clearAllMocks()
  mockGetOrganisationInvitesForOrg.mockResolvedValue([])
})

describe('seatAssignments api', () => {
  it('builds seat assignment snapshot and filters unsupported app codes', async () => {
    mockRpc
      .mockResolvedValue({ error: null })
    mockFrom.mockImplementation((table: string) => {
      if (table === 'account_org_context') {
        const limit = vi.fn().mockResolvedValue({
          data: [{ org_id: 'org-1', member_role: 'admin' }],
          error: null,
        })
        return {
          select: vi.fn(() => ({
            order: vi.fn(() => ({ limit })),
          })),
        }
      }
      if (table === 'account_org_member_app_assignments') {
        const order = vi.fn().mockResolvedValue({
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
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ order })),
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })
    mockGetOrganisationInvitesForOrg.mockResolvedValue([
      {
        id: 'inv-1',
        org_id: 'org-1',
        email: 'pending@example.com',
        created_at: '2026-05-20T00:00:00.000Z',
        assigned_apps: ['etl', 'unknown', 'stoqr'],
      },
    ])

    const snapshot = await getSeatAssignmentSnapshot()

    expect(snapshot).toEqual({
      orgId: 'org-1',
      currentRole: 'admin',
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
      pendingInvites: [
        {
          id: 'inv-1',
          orgId: 'org-1',
          email: 'pending@example.com',
          createdAt: '2026-05-20T00:00:00.000Z',
          assignedApps: ['etl', 'stoqr'],
        },
      ],
    })

    expect(mockFrom).toHaveBeenNthCalledWith(1, 'account_org_context')
    expect(mockFrom).toHaveBeenNthCalledWith(2, 'account_org_member_app_assignments')
    expect(mockGetOrganisationInvitesForOrg).toHaveBeenCalledWith('org-1')
  })

  it('throws when no membership context exists', async () => {
    mockFrom.mockImplementation((table: string) => {
      if (table !== 'account_org_context') throw new Error(`Unexpected table: ${table}`)
      const limit = vi.fn().mockResolvedValue({ data: [], error: null })
      return {
        select: vi.fn(() => ({
          order: vi.fn(() => ({ limit })),
        })),
      }
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

  it('assignInviteSeat calls RPC with expected payload', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await assignInviteSeat('inv-1', 'etl')

    expect(mockRpc).toHaveBeenCalledWith('accounts_assign_org_invite_app_seat', {
      p_invite_id: 'inv-1',
      p_app_code: 'etl',
    })
  })

  it('unassignInviteSeat calls RPC with expected payload', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await unassignInviteSeat('inv-1', 'stoqr')

    expect(mockRpc).toHaveBeenCalledWith('accounts_unassign_org_invite_app_seat', {
      p_invite_id: 'inv-1',
      p_app_code: 'stoqr',
    })
  })

  it('inviteSeatMembers normalizes and de-duplicates emails before inviting and assigning pending seats', async () => {
    mockInviteOrganisationMember
      .mockResolvedValueOnce({
        id: 'inv-1',
        org_id: 'org-1',
        email: 'member@example.com',
        created_at: '2026-05-20T00:00:00.000Z',
        assigned_apps: [],
      })
      .mockResolvedValueOnce({
        id: 'inv-2',
        org_id: 'org-1',
        email: 'second@example.com',
        created_at: '2026-05-20T00:00:00.000Z',
        assigned_apps: [],
      })
    mockRpc.mockResolvedValue({ error: null })

    await inviteSeatMembers('org-1', [
      ' MEMBER@Example.com ',
      'member@example.com',
      'second@example.com',
      '',
    ], ['etl', 'stoqr'])

    expect(mockInviteOrganisationMember).toHaveBeenCalledTimes(2)
    expect(mockInviteOrganisationMember).toHaveBeenNthCalledWith(1, 'org-1', 'member@example.com', 'member')
    expect(mockInviteOrganisationMember).toHaveBeenNthCalledWith(2, 'org-1', 'second@example.com', 'member')
    expect(mockRpc).toHaveBeenCalledTimes(4)
    expect(mockRpc).toHaveBeenNthCalledWith(1, 'accounts_assign_org_invite_app_seat', {
      p_invite_id: 'inv-1',
      p_app_code: 'etl',
    })
    expect(mockRpc).toHaveBeenNthCalledWith(2, 'accounts_assign_org_invite_app_seat', {
      p_invite_id: 'inv-1',
      p_app_code: 'stoqr',
    })
    expect(mockRpc).toHaveBeenNthCalledWith(3, 'accounts_assign_org_invite_app_seat', {
      p_invite_id: 'inv-2',
      p_app_code: 'etl',
    })
    expect(mockRpc).toHaveBeenNthCalledWith(4, 'accounts_assign_org_invite_app_seat', {
      p_invite_id: 'inv-2',
      p_app_code: 'stoqr',
    })
  })

  it('cancelSeatInvite delegates to shared org invite cancellation', async () => {
    mockCancelOrganisationInviteForOrg.mockResolvedValue(undefined)

    await cancelSeatInvite('org-1', 'inv-1')

    expect(mockCancelOrganisationInviteForOrg).toHaveBeenCalledWith('org-1', 'inv-1')
  })

  it('propagates RPC errors from seat assignment operations', async () => {
    mockRpc.mockResolvedValue({ error: { message: 'rpc failed' } })

    await expect(assignSeat('member-1', 'etl')).rejects.toMatchObject({ message: 'rpc failed' })
  })
})
