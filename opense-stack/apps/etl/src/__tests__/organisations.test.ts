import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetSession = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
    },
    from: vi.fn(),
  },
}))

vi.mock('@repo/shared/organisation-invites', () => ({
  getPendingOrganisationInvites: vi.fn(),
  acceptOrganisationInvite: vi.fn(),
  declineOrganisationInvite: vi.fn(),
  inviteOrganisationMember: vi.fn(),
}))

import { updateOrganisationTier } from '../api/organisations'

beforeEach(() => {
  vi.clearAllMocks()
})

afterEach(() => {
  vi.unstubAllGlobals()
  vi.unstubAllEnvs()
})

describe('updateOrganisationTier', () => {
  it('falls back to create-checkout when update-subscription fails', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: { access_token: 'token-123' },
      },
    })

    vi.stubEnv('VITE_SUPABASE_URL', 'https://example.supabase.co')
    vi.stubEnv('VITE_SUPABASE_ANON_KEY', 'anon-key')

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    fetchMock
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ error: 'subscription update failed' }), {
          status: 500,
          headers: { 'content-type': 'application/json' },
        }),
      )
      .mockResolvedValueOnce(
        new Response(JSON.stringify({ url: 'https://checkout.stripe.com/test' }), {
          status: 200,
          headers: { 'content-type': 'application/json' },
        }),
      )

    const result = await updateOrganisationTier('org-1', 'tier-2', 'Acme Org')

    expect(result).toEqual({
      paymentUrl: 'https://checkout.stripe.com/test',
      message: 'Checkout started',
    })

    expect(fetchMock).toHaveBeenCalledTimes(2)
    expect(fetchMock.mock.calls[0]?.[0]).toContain('/functions/v1/update-subscription')
    expect(fetchMock.mock.calls[1]?.[0]).toContain('/functions/v1/create-checkout')
  })

  it('throws when session is missing', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: null,
      },
    })

    const fetchMock = vi.fn()
    vi.stubGlobal('fetch', fetchMock)

    await expect(updateOrganisationTier('org-1', 'tier-2', 'Acme Org')).rejects.toThrow(
      'Missing authenticated session. Please sign in again and retry.',
    )

    expect(fetchMock).not.toHaveBeenCalled()
  })
})
