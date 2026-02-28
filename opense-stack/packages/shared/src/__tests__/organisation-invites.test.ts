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
  declineOrganisationInvite,
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

  it('inviteOrganisationMember normalizes email before upsert', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'owner@example.com' } },
      error: null,
    })

    const upsert = vi.fn().mockResolvedValue({ error: null })
    mockFrom.mockReturnValue({ upsert })

    await inviteOrganisationMember('org-1', ' MEMBER@Example.com ', 'member')

    expect(upsert).toHaveBeenCalledWith(
      {
        org_id: 'org-1',
        email: 'member@example.com',
        invited_by: 'user-1',
      },
      { onConflict: 'org_id,email', ignoreDuplicates: false },
    )
  })
})
