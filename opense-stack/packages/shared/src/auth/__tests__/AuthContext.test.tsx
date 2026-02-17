import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { AuthProvider, useAuth, type AuthContextType } from '../AuthContext'
import { DEMO_USER_ID } from '../demo'

const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignOut = vi.fn()
const mockRpc = vi.fn()
const mockUnsubscribe = vi.fn()

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      getUser: () => mockGetUser(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

describe('AuthProvider', () => {
  let latestAuth: AuthContextType | undefined

  const Probe = () => {
    latestAuth = useAuth()
    return null
  }

  beforeEach(() => {
    latestAuth = undefined
    vi.clearAllMocks()
    mockUnsubscribe.mockReset()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockSignOut.mockResolvedValue({ error: null })
    mockRpc.mockResolvedValue({ data: true, error: null })
    mockOnAuthStateChange.mockImplementation((callback: (_event: string, session: Session | null) => void) => {
      void callback
      return { data: { subscription: { unsubscribe: mockUnsubscribe } } }
    })
  })

  it('always provides base auth fields', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(latestAuth?.loading).toBe(false))
    expect(latestAuth?.session).toBeNull()
    expect(latestAuth?.user).toBeNull()
    expect(latestAuth?.isDemoUser).toBeUndefined()
    expect(latestAuth?.isSuperAdmin).toBeUndefined()
  })

  it('enables demo mode fields only when demoMode is true', async () => {
    render(
      <AuthProvider demoMode>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(latestAuth?.loading).toBe(false))
    expect(latestAuth?.isDemoUser).toBe(false)
    expect(typeof latestAuth?.loginAsDemo).toBe('function')

    await act(async () => {
      latestAuth?.loginAsDemo?.()
    })

    expect(latestAuth?.isDemoUser).toBe(true)
    expect(latestAuth?.user?.id).toBe(DEMO_USER_ID)
  })

  it('enables super admin checks only when superAdmin is true', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'user-1', email: 'test@example.com' },
        },
      },
    })
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'user-1',
          email: 'test@example.com',
        },
      },
      error: null,
    })

    render(
      <AuthProvider superAdmin>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => {
      expect(mockRpc).toHaveBeenCalledWith('get_super_admin_status')
      expect(latestAuth?.superAdminChecked).toBe(true)
      expect(latestAuth?.isSuperAdmin).toBe(true)
    })
  })

  it('clears stale cached sessions that fail server validation on initialization', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'stale-user', email: 'stale@example.com' },
        },
      },
    })
    mockGetUser.mockResolvedValue({
      data: { user: null },
      error: { message: 'User not found' },
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(latestAuth?.loading).toBe(false))
    expect(mockSignOut).toHaveBeenCalledWith({ scope: 'local' })
    expect(latestAuth?.session).toBeNull()
    expect(latestAuth?.user).toBeNull()
  })
})
