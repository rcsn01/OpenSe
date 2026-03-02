import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()
const mockFrom = vi.fn()

vi.mock('@repo/shared/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
    from: (...args: unknown[]) => mockFrom(...args),
    functions: {
      invoke: vi.fn(),
    },
  },
}))

import {
  changeOrganisationOwner,
  createOrganisationWithOwner,
  listAdminOrgs,
  listAdminUsers,
} from '../etlAdmin'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('etlAdmin api', () => {
  it('maps admin organisations from RPC response', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'org-1',
          name: 'Acme',
          created_at: '2026-02-19',
          owner_email: 'owner@example.com',
          owner_full_name: 'Owner Name',
          member_count: 4,
        },
      ],
      error: null,
    })

    const result = await listAdminOrgs()

    expect(mockRpc).toHaveBeenCalledWith('admin_list_organisations')
    expect(result).toEqual([
      {
        id: 'org-1',
        name: 'Acme',
        created_at: '2026-02-19',
        owner: {
          email: 'owner@example.com',
          full_name: 'Owner Name',
        },
        member_count: 4,
      },
    ])
  })

  it('maps admin users with super-admin flag and memberships', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'u1',
          email: 'admin@example.com',
          full_name: 'Admin',
          created_at: '2026-02-19',
          is_super_admin: true,
          memberships: [{ org_id: 'org-1', org_name: 'Acme', role: 'owner' }],
        },
        {
          id: 'u2',
          email: 'user@example.com',
          full_name: 'User',
          created_at: null,
          is_super_admin: false,
          memberships: null,
        },
      ],
      error: null,
    })

    const result = await listAdminUsers()

    expect(mockRpc).toHaveBeenCalledWith('admin_list_users')
    expect(result[0]?.super_admin_members).toEqual([{ user_id: 'u1' }])
    expect(result[1]?.super_admin_members).toEqual([])
    expect(result[1]?.memberships).toEqual([])
  })

  it('createOrganisationWithOwner rejects unknown owner', async () => {
    const profilesChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profilesChain
      throw new Error(`Unexpected table: ${table}`)
    })

    await expect(createOrganisationWithOwner('Acme', 'missing@example.com')).rejects.toThrow(
      'User not found. Ask them to sign up first.',
    )
  })

  it('createOrganisationWithOwner creates organisation with owner id', async () => {
    const profile = { id: 'user-1', email: 'owner@example.com', full_name: 'Owner' }

    const profilesChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [profile], error: null }),
        })),
      })),
    }

    const membersSelectChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [], error: null }),
        })),
      })),
    }

    const orgSingle = vi.fn().mockResolvedValue({
      data: { id: 'org-1', name: 'Acme', owner_id: 'user-1', created_at: '2026-02-19' },
      error: null,
    })
    const organisationsChain = {
      insert: vi.fn(() => ({
        select: vi.fn(() => ({ single: orgSingle })),
      })),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profilesChain
      if (table === 'organisations') return organisationsChain
      if (table === 'organisation_members') {
        return membersSelectChain
      }
      throw new Error(`Unexpected table: ${table}`)
    })

    const result = await createOrganisationWithOwner('Acme', 'OWNER@EXAMPLE.COM')

    expect(result).toEqual({ id: 'org-1', name: 'Acme', owner_id: 'user-1', created_at: '2026-02-19' })
  })

  it('changeOrganisationOwner updates only organisation owner_id', async () => {
    const profile = { id: 'user-2', email: 'new-owner@example.com', full_name: 'New Owner' }

    const profilesChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          limit: vi.fn().mockResolvedValue({ data: [profile], error: null }),
        })),
      })),
    }

    const membersChain = {
      select: vi.fn(() => ({
        eq: vi.fn(() => ({
          data: [{ org_id: 'org-1' }],
          error: null,
        })),
      })),
      update: vi.fn(),
      insert: vi.fn(),
    }

    const orgUpdateEq = vi.fn().mockResolvedValue({ error: null })
    const organisationsChain = {
      update: vi.fn(() => ({ eq: orgUpdateEq })),
    }

    mockFrom.mockImplementation((table: string) => {
      if (table === 'profiles') return profilesChain
      if (table === 'organisation_members') return membersChain
      if (table === 'organisations') return organisationsChain
      throw new Error(`Unexpected table: ${table}`)
    })

    await expect(changeOrganisationOwner('org-1', 'new-owner@example.com')).resolves.toBeUndefined()

    expect(organisationsChain.update).toHaveBeenCalledWith({ owner_id: 'user-2' })
    expect(orgUpdateEq).toHaveBeenCalledWith('id', 'org-1')
    expect(membersChain.update).not.toHaveBeenCalled()
    expect(membersChain.insert).not.toHaveBeenCalled()
  })
})
