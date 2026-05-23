import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetUser = vi.fn()
const mockUpdateUser = vi.fn()
const mockFrom = vi.fn()
const mockRpc = vi.fn()

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
  acceptOrganisationInvite: vi.fn(),
  declineOrganisationInvite: vi.fn(),
  getPendingOrganisationInvites: (...args: unknown[]) => mockGetPendingOrganisationInvites(...args),
  inviteOrganisationMember: (...args: unknown[]) => mockInviteOrganisationMember(...args),
}))

import {
  createOrganisationForOnboarding,
  getOnboardingInstancePolicy,
  getOnboardingStatus,
  inviteOrganisationMembers,
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
  })

  it('returns create step when no membership and no pending invites', async () => {
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

    const status = await getOnboardingStatus()

    expect(status.step).toBe('create')
    expect(status.pendingInvites).toEqual([])
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

  it('creates onboarding organisation through RPC with selected apps', async () => {
    mockGetUser.mockResolvedValue({
      data: { user: { id: 'user-1', user_metadata: {} } },
      error: null,
    })
    mockRpc.mockResolvedValue({
      data: [{ org_id: 'org-1', org_name: 'Acme' }],
      error: null,
    })

    await expect(createOrganisationForOnboarding({
      name: 'Acme',
      selectedApps: ['etl'],
    })).resolves.toEqual({ orgId: 'org-1', orgName: 'Acme' })

    expect(mockRpc).toHaveBeenCalledWith('accounts_create_organisation', {
      p_name: 'Acme',
      p_selected_apps: ['etl'],
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
