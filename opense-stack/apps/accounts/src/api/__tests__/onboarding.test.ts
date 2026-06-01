import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

const mockAcceptOrganisationInvite = vi.fn()
const mockGetPendingOrganisationInvites = vi.fn()
const mockInviteOrganisationMember = vi.fn()

vi.mock('@repo/shared/supabase', () => ({
  supabase: {
    auth: {
      getUser: (...args: unknown[]) => mockGetUser(...args),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
    },
    from: (...args: unknown[]) => mockFrom(...args),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

vi.mock('@repo/shared/organisation-invites', () => ({
  acceptOrganisationInvite: (...args: unknown[]) => mockAcceptOrganisationInvite(...args),
  declineOrganisationInvite: vi.fn(),
  getPendingOrganisationInvites: (...args: unknown[]) => mockGetPendingOrganisationInvites(...args),
  inviteOrganisationMember: (...args: unknown[]) => mockInviteOrganisationMember(...args),
}))

import {
  acceptOrganisationInvite,
  createOrganisationForOnboarding,
  getOnboardingInstancePolicy,
  getOnboardingStatus,
  inviteOrganisationMembers,
  startInviteMembersOnboarding,
} from '../onboarding'

const makeMembershipChain = (rows: unknown[]) => {
  const chain = {
    select: vi.fn(() => chain),
    eq: vi.fn(() => chain),
    order: vi.fn(() => chain),
    limit: vi.fn().mockResolvedValue({ data: rows, error: null }),
  }

  return chain
}

beforeEach(() => {
  vi.clearAllMocks()
  mockUpdateUser.mockResolvedValue({ error: null })
})

describe('onboarding api', () => {
  it('returns done status when membership exists and completion flag is implied', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisation_members') {
        return makeMembershipChain([
          {
            org_id: 'org-1',
            role: 'owner',
            organisations: { name: 'Acme' },
          },
        ])
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const status = await getOnboardingStatus()

    expect(status).toMatchObject({
      needsOnboarding: false,
      step: 'done',
      orgId: 'org-1',
      orgName: 'Acme',
      role: 'owner',
    })
    expect(mockGetPendingOrganisationInvites).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns invite-members when membership exists but completion flag is false', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: { accounts_onboarding_completed: false },
        },
      },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisation_members') {
        return makeMembershipChain([
          {
            org_id: 'org-1',
            role: 'admin',
            organisations: [{ name: 'Acme Team' }],
          },
        ])
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    const status = await getOnboardingStatus()

    expect(status).toMatchObject({
      needsOnboarding: true,
      step: 'invite-members',
      orgId: 'org-1',
      orgName: 'Acme Team',
      role: 'admin',
    })
    expect(mockGetPendingOrganisationInvites).not.toHaveBeenCalled()
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns invites step when no membership exists but pending invites exist', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisation_members') {
        return makeMembershipChain([])
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockGetPendingOrganisationInvites.mockResolvedValue([
      {
        id: 'inv-1',
        org_id: 'org-2',
        org_name: 'New Org',
        inviter_name: 'Owner',
        role: 'member',
        created_at: '2026-02-19T00:00:00.000Z',
      },
    ])

    const status = await getOnboardingStatus()

    expect(status.step).toBe('invites')
    expect(status.pendingInvites).toHaveLength(1)
    expect(status.pendingInvites[0]?.orgName).toBe('New Org')
    expect(mockRpc).not.toHaveBeenCalled()
  })

  it('returns create step when no membership, no pending invites, and policy allows creation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisation_members') {
        return makeMembershipChain([])
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockGetPendingOrganisationInvites.mockResolvedValue([])
    mockRpc.mockResolvedValue({
      data: [{
        can_create_organisation: true,
        organisation_count: 0,
        max_organisations: 1,
        free_seat_limit: null,
      }],
      error: null,
    })

    const status = await getOnboardingStatus()

    expect(status.step).toBe('create')
    expect(status.pendingInvites).toEqual([])
    expect(mockRpc).toHaveBeenCalledWith('accounts_get_onboarding_instance_policy')
  })

  it('returns blocked step when no membership, no pending invites, and policy forbids creation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    })

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisation_members') {
        return makeMembershipChain([])
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    mockGetPendingOrganisationInvites.mockResolvedValue([])
    mockRpc.mockResolvedValue({
      data: [{
        can_create_organisation: false,
        organisation_count: 1,
        max_organisations: 1,
        free_seat_limit: null,
      }],
      error: null,
    })

    const status = await getOnboardingStatus()

    expect(status.step).toBe('blocked')
    expect(status.pendingInvites).toEqual([])
    expect(mockRpc).toHaveBeenCalledWith('accounts_get_onboarding_instance_policy')
  })

  it('accepts an organisation invite without writing auth metadata', async () => {
    mockAcceptOrganisationInvite.mockResolvedValue(undefined)

    await acceptOrganisationInvite('inv-1')

    expect(mockAcceptOrganisationInvite).toHaveBeenCalledWith('inv-1')
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('starts invite-member onboarding metadata only when requested', async () => {
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          user_metadata: { theme: 'dark' },
        },
      },
      error: null,
    })

    await startInviteMembersOnboarding()

    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: {
        theme: 'dark',
        accounts_onboarding_completed: false,
        accounts_onboarding_stage: 'invite-members',
      },
    })
  })

  it('validates organisation name before creating onboarding org', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    })

    await expect(
      createOrganisationForOnboarding({
        name: '   ',
        selectedApps: ['etl'],
        freeSeatLimit: 1,
      })
    ).rejects.toThrow('Organisation name is required.')

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('rejects unsupported app codes during organisation creation', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    })

    await expect(
      createOrganisationForOnboarding({
        name: 'Acme',
        selectedApps: ['etl', 'invalid-app' as never],
        freeSeatLimit: 1,
      })
    ).rejects.toThrow('Unsupported app code: invalid-app')

    expect(mockFrom).not.toHaveBeenCalled()
  })

  it('reads onboarding instance policy from RPC', async () => {
    mockRpc.mockResolvedValue({
      data: [{
        can_create_organisation: false,
        organisation_count: 1,
        max_organisations: 1,
        free_seat_limit: null,
      }],
      error: null,
    })

    await expect(getOnboardingInstancePolicy()).resolves.toEqual({
      canCreateOrganisation: false,
      organisationCount: 1,
      maxOrganisations: 1,
      freeSeatLimit: null,
    })
  })

  it('creates onboarding organisation through direct table writes with selected apps', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', email: 'user@example.com', user_metadata: { theme: 'dark' } } },
      error: null,
    })

    const orgInsertSingle = vi.fn().mockResolvedValue({
      data: { id: 'org-1', name: 'Acme' },
      error: null,
    })
    const orgInsertChain = {
      select: vi.fn(() => ({ single: orgInsertSingle })),
    }
    const seatUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const seatUpdate = vi.fn(() => ({
      eq: vi.fn(() => ({
        eq: seatUpdateEq,
      })),
    }))
    const inviteDeleteEq = vi.fn().mockResolvedValue({ error: null })
    const membershipLimit = vi.fn().mockResolvedValue({ data: [], error: null })
    const membershipEq = vi.fn(() => ({ limit: membershipLimit }))

    mockFrom.mockImplementation((table: string) => {
      if (table === 'organisation_members') {
        return {
          select: vi.fn(() => ({
            eq: membershipEq,
          })),
        }
      }
      if (table === 'organisations') {
        return {
          insert: vi.fn(() => orgInsertChain),
        }
      }
      if (table === 'organisation_app_seats') {
        return {
          update: seatUpdate,
        }
      }
      if (table === 'organisation_invites') {
        return {
          delete: vi.fn(() => ({
            eq: inviteDeleteEq,
          })),
        }
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    await expect(createOrganisationForOnboarding({
      name: 'Acme',
      selectedApps: ['etl'],
      freeSeatLimit: 5,
    })).resolves.toEqual({ orgId: 'org-1', orgName: 'Acme' })

    expect(mockFrom).toHaveBeenCalledWith('organisation_members')
    expect(mockFrom).toHaveBeenCalledWith('organisations')
    expect(mockFrom).toHaveBeenCalledWith('organisation_app_seats')
    expect(mockFrom).toHaveBeenCalledWith('organisation_invites')
    expect(membershipEq).toHaveBeenCalledWith('user_id', 'user-1')
    expect(membershipLimit).toHaveBeenCalledWith(1)
    expect(seatUpdate).toHaveBeenCalledTimes(2)
    expect(seatUpdate).toHaveBeenNthCalledWith(1, { seat_limit: 5 })
    expect(seatUpdate).toHaveBeenNthCalledWith(2, { seat_limit: 0 })
    expect(seatUpdateEq).toHaveBeenNthCalledWith(1, 'app_code', 'etl')
    expect(seatUpdateEq).toHaveBeenNthCalledWith(2, 'app_code', 'stoqr')
    expect(mockUpdateUser).toHaveBeenCalledWith({
      data: {
        theme: 'dark',
        accounts_onboarding_completed: false,
        accounts_onboarding_stage: 'invite-members',
      },
    })
  })

  it('normalizes and de-duplicates emails before inviting members', async () => {
    mockInviteOrganisationMember.mockResolvedValue(undefined)

    await inviteOrganisationMembers('org-1', [
      ' MEMBER@Example.com ',
      'member@example.com',
      'second@example.com',
      '',
      '   ',
    ])

    expect(mockInviteOrganisationMember).toHaveBeenCalledTimes(2)
    expect(mockInviteOrganisationMember).toHaveBeenNthCalledWith(
      1,
      'org-1',
      'member@example.com',
      'member',
    )
    expect(mockInviteOrganisationMember).toHaveBeenNthCalledWith(
      2,
      'org-1',
      'second@example.com',
      'member',
    )
  })
})
