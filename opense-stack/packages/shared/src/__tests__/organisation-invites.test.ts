import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('../supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
  },
}))

import {
  acceptOrganisationInvite,
  cancelOrganisationInviteForOrg,
  declineOrganisationInvite,
  getOrganisationInvitesForOrg,
  inviteOrganisationMember,
} from '../organisation-invites'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('organisation invites', () => {
  it('acceptOrganisationInvite calls RPC with invite id', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await acceptOrganisationInvite('inv-1')

    expect(mockRpc).toHaveBeenCalledWith('accept_invite', { invite_id: 'inv-1' })
  })

  it('declineOrganisationInvite surfaces auth errors', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'Auth failed' },
    })

    await expect(declineOrganisationInvite('inv-1')).rejects.toMatchObject({ message: 'Auth failed' })
    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('inviteOrganisationMember normalizes email before calling invite RPC', async () => {
    mockRpc.mockResolvedValue({ error: null })

    await inviteOrganisationMember('org-1', ' MEMBER@Example.com ', 'member')

    expect(mockRpc).toHaveBeenCalledWith('accounts_invite_organisation_member', {
      p_org_id: 'org-1',
      p_email: 'member@example.com',
    })
  })

  it('getOrganisationInvitesForOrg lists pending invites for an org', async () => {
    const chain = {
      select: vi.fn(() => chain),
      eq: vi.fn(() => chain),
      is: vi.fn(() => chain),
      order: vi.fn().mockResolvedValue({
        data: [
          {
            id: 'inv-1',
            org_id: 'org-1',
            email: ' MEMBER@Example.com ',
            created_at: '2026-05-20T00:00:00.000Z',
          },
        ],
        error: null,
      }),
    }
    mockFrom.mockReturnValue(chain)

    await expect(getOrganisationInvitesForOrg('org-1')).resolves.toEqual([
      {
        id: 'inv-1',
        org_id: 'org-1',
        email: 'member@example.com',
        created_at: '2026-05-20T00:00:00.000Z',
      },
    ])

    expect(mockFrom).toHaveBeenCalledWith('organisation_invites')
    expect(chain.eq).toHaveBeenCalledWith('org_id', 'org-1')
    expect(chain.is).toHaveBeenCalledWith('accepted_at', null)
  })

  it('cancelOrganisationInviteForOrg deletes only the org invite row', async () => {
    const chain: any = {
      delete: vi.fn(() => chain),
      eq: vi.fn(() => chain),
    }
    chain.eq
      .mockReturnValueOnce(chain)
      .mockResolvedValueOnce({ error: null })
    mockFrom.mockReturnValue(chain)

    await cancelOrganisationInviteForOrg('org-1', 'inv-1')

    expect(chain.eq).toHaveBeenNthCalledWith(1, 'org_id', 'org-1')
    expect(chain.eq).toHaveBeenNthCalledWith(2, 'id', 'inv-1')
  })
})
