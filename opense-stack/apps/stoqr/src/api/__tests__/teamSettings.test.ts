import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockDbFrom = vi.fn()
const mockSupabaseFrom = vi.fn()
const mockMfaGetAal = vi.fn()
const mockMfaListFactors = vi.fn()

vi.mock('../../supabaseClient', () => ({
  db: {
    from: (...args: unknown[]) => mockDbFrom(...args),
  },
  supabase: {
    from: (...args: unknown[]) => mockSupabaseFrom(...args),
    auth: {
      mfa: {
        getAuthenticatorAssuranceLevel: (...args: unknown[]) => mockMfaGetAal(...args),
        listFactors: (...args: unknown[]) => mockMfaListFactors(...args),
      },
    },
  },
}))

import {
  fetchTeamActivityEvents,
  fetchTeamSettingsData,
  fetchTwoFactorStatus,
  updateCompanyMemberRole,
} from '../teamSettings'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('team settings api', () => {
  it('fetches members, invitations, roles and permissions', async () => {
    const organisationMemberRoles = {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'm-1', user_id: 'u-1', role_id: 'r-1', joined_at: '2026-02-24T00:00:00Z' }],
          error: null,
        }),
      })),
    }

    const roles = {
      select: vi.fn(() => ({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: 'r-1', name: 'Admin', description: 'Admin role' }],
          error: null,
        }),
      })),
    }

    const permissions = {
      select: vi.fn().mockResolvedValue({
        data: [{ code: 'inventory.read', description: 'Inventory Read' }],
        error: null,
      }),
    }

    const invitations = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          is: vi.fn(() => ({
            order: vi.fn().mockResolvedValue({
              data: [{ id: 'i-1', email: 'user@example.com', created_at: '2026-02-24T00:00:00Z' }],
              error: null,
            }),
          })),
        })),
      })),
    }

    const rolePermissions = {
      select: vi.fn(() => ({
        in: vi.fn().mockResolvedValue({
          data: [{ role_id: 'r-1', permission_code: 'inventory.read' }],
          error: null,
        }),
      })),
    }

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'organisation_member_roles') return organisationMemberRoles
      if (table === 'roles') return roles
      if (table === 'app_permissions') return permissions
      if (table === 'role_permissions') return rolePermissions
      throw new Error(`Unexpected table: ${table}`)
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table === 'profiles') {
        return {
          select: vi.fn(() => ({
            in: vi.fn().mockResolvedValue({
              data: [{ id: 'u-1', full_name: 'Jane Admin', username: 'jane', avatar_url: null }],
              error: null,
            }),
          })),
        }
      }

      if (table === 'organisation_invites') return invitations

      throw new Error(`Unexpected supabase table: ${table}`)
    })

    const result = await fetchTeamSettingsData('company-1')

    expect(result.members).toHaveLength(1)
    expect(result.invitations).toHaveLength(1)
    expect(result.roles).toHaveLength(1)
    expect(result.permissions).toHaveLength(1)
    expect(result.rolePermissions['r-1']).toEqual(['inventory.read'])
  })

  it('fetches activity events and enriches actor profile', async () => {
    mockDbFrom.mockImplementation((table: string) => {
      if (table !== 'activity_events') throw new Error(`Unexpected table: ${table}`)
      return {
        select: vi.fn(() => ({
          eq: vi.fn(() => ({
            order: vi.fn(() => ({
              limit: vi.fn().mockResolvedValue({
                data: [{ id: 'a-1', actor_user_id: 'u-1', event_type: 'member.invited', message: 'Invited user', metadata: {}, created_at: '2026-02-24T00:00:00Z' }],
                error: null,
              }),
            })),
          })),
        })),
      }
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected supabase table: ${table}`)
      return {
        select: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'u-1', full_name: 'Jane Admin', username: 'jane' }],
            error: null,
          }),
        })),
      }
    })

    const events = await fetchTeamActivityEvents('company-1')

    expect(events).toHaveLength(1)
    expect(events[0].profiles?.full_name).toBe('Jane Admin')
  })

  it('fetches current user two-factor status from supabase mfa', async () => {
    mockMfaGetAal.mockResolvedValue({
      data: { currentLevel: 'aal1', nextLevel: 'aal2' },
      error: null,
    })

    mockMfaListFactors.mockResolvedValue({
      data: {
        all: [],
        totp: [{ id: 'factor-1', status: 'verified', factor_type: 'totp', friendly_name: 'Authenticator App' }],
        phone: [],
      },
      error: null,
    })

    const result = await fetchTwoFactorStatus()

    expect(result.currentLevel).toBe('aal1')
    expect(result.nextLevel).toBe('aal2')
    expect(result.hasVerifiedFactor).toBe(true)
    expect(result.factors).toHaveLength(1)
  })

  it('updates company member role', async () => {
    const updateEq = vi.fn().mockResolvedValue({ error: null })
    const update = vi.fn(() => ({ eq: updateEq }))

    const memberSingle = vi.fn().mockResolvedValue({
      data: { id: 'member-1', user_id: 'u-2', company_id: 'company-1', role_id: 'role-2' },
      error: null,
    })

    const ownerSingle = vi.fn().mockResolvedValue({
      data: { id: 'owner-role-id' },
      error: null,
    })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'organisation_member_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: memberSingle })),
          })),
          update,
        }
      }

      if (table === 'roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: ownerSingle })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await expect(updateCompanyMemberRole('member-1', 'role-2')).resolves.toBeUndefined()
    expect(update).toHaveBeenCalledWith({ role_id: 'role-2' })
    expect(updateEq).toHaveBeenCalledWith('id', 'member-1')
  })

  it('throws when update company member role fails', async () => {
    const dbError = new Error('rls denied')
    const updateEq = vi.fn().mockResolvedValue({ error: dbError })
    const update = vi.fn(() => ({ eq: updateEq }))

    const memberSingle = vi.fn().mockResolvedValue({
      data: { id: 'member-1', user_id: 'u-2', company_id: 'company-1', role_id: 'role-2' },
      error: null,
    })

    const ownerSingle = vi.fn().mockResolvedValue({
      data: { id: 'owner-role-id' },
      error: null,
    })

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'organisation_member_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: memberSingle })),
          })),
          update,
        }
      }

      if (table === 'roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: ownerSingle })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await expect(updateCompanyMemberRole('member-1', 'role-2')).rejects.toThrow('rls denied')
  })

  it('throws when updating owner role assignment', async () => {
    const memberSingle = vi.fn().mockResolvedValue({
      data: { id: 'member-1', user_id: 'u-2', company_id: 'company-1', role_id: 'owner-role-id' },
      error: null,
    })

    const ownerSingle = vi.fn().mockResolvedValue({
      data: { id: 'owner-role-id' },
      error: null,
    })

    const update = vi.fn(() => ({ eq: vi.fn() }))

    mockDbFrom.mockImplementation((table: string) => {
      if (table === 'organisation_member_roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({ single: memberSingle })),
          })),
          update,
        }
      }

      if (table === 'roles') {
        return {
          select: vi.fn(() => ({
            eq: vi.fn(() => ({
              eq: vi.fn(() => ({ single: ownerSingle })),
            })),
          })),
        }
      }

      throw new Error(`Unexpected table: ${table}`)
    })

    await expect(updateCompanyMemberRole('member-1', 'role-2')).rejects.toThrow(
      'Owner role is system-managed and cannot be changed directly.',
    )
    expect(update).not.toHaveBeenCalled()
  })
})
