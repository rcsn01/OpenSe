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
} from '../teamSettings'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('team settings api', () => {
  it('fetches members, invitations, roles and permissions', async () => {
    const companyMembers = {
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
          order: vi.fn().mockResolvedValue({
            data: [{ id: 'i-1', email: 'user@example.com', role_id: 'r-1', accepted_at: null, created_at: '2026-02-24T00:00:00Z', roles: { id: 'r-1', name: 'Admin' } }],
            error: null,
          }),
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
      if (table === 'company_members') return companyMembers
      if (table === 'roles') return roles
      if (table === 'app_permissions') return permissions
      if (table === 'company_invitations') return invitations
      if (table === 'role_permissions') return rolePermissions
      throw new Error(`Unexpected table: ${table}`)
    })

    mockSupabaseFrom.mockImplementation((table: string) => {
      if (table !== 'profiles') throw new Error(`Unexpected supabase table: ${table}`)
      return {
        select: vi.fn(() => ({
          in: vi.fn().mockResolvedValue({
            data: [{ id: 'u-1', full_name: 'Jane Admin', username: 'jane', avatar_url: null }],
            error: null,
          }),
        })),
      }
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
})
