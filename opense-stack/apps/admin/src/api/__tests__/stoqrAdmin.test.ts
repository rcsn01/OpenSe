import { describe, expect, it, vi } from 'vitest'

const mockRpc = vi.fn()

vi.mock('@repo/shared/supabase', () => ({
  supabase: {
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { inviteMember, listCompanies, listCompanyMembers, removeMember } from '../stoqrAdmin'

describe('stoqrAdmin api', () => {
  it('lists companies via admin RPC', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [{ id: 'c1', name: 'Company', created_at: '2026-02-19', member_count: 3 }],
      error: null,
    })

    const result = await listCompanies()

    expect(mockRpc).toHaveBeenCalledWith('admin_list_stoqr_organisations')
    expect(result).toEqual([{ id: 'c1', name: 'Company', created_at: '2026-02-19', member_count: 3 }])
  })

  it('lists company members and normalizes shape', async () => {
    mockRpc.mockResolvedValueOnce({
      data: [
        {
          id: 'm1',
          user_id: 'u1',
          joined_at: '2026-02-19',
          role_name: 'manager',
          full_name: 'Alice',
          email: 'alice@example.com',
        },
      ],
      error: null,
    })

    const result = await listCompanyMembers('company-1')

    expect(mockRpc).toHaveBeenCalledWith('admin_list_stoqr_company_members', {
      p_company_id: 'company-1',
    })
    expect(result).toEqual([
      {
        id: 'm1',
        user_id: 'u1',
        joined_at: '2026-02-19',
        role_name: 'manager',
        full_name: 'Alice',
        email: 'alice@example.com',
      },
    ])
  })

  it('removeMember throws guidance error', async () => {
    await expect(removeMember('member-1')).rejects.toThrow('Use Accounts to manage seats and membership')
  })

  it('inviteMember throws guidance error', async () => {
    await expect(inviteMember('company-1', 'user@example.com')).rejects.toThrow(
      'Use Accounts to manage seats and membership',
    )
  })
})
