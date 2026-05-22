import { act, render, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Session } from '@supabase/supabase-js'
import { AuthProvider, useAuth, type AuthContextType } from '../AuthContext'
import { DEMO_USER_ID } from '../demo'

const mockGetSession = vi.fn()
const mockGetUser = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockSignOut = vi.fn()
const mockUnsubscribe = vi.fn()
let authStateChangeCallback: ((event: string, session: Session | null) => void) | undefined

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: () => mockGetSession(),
      getUser: () => mockGetUser(),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
      signOut: (...args: unknown[]) => mockSignOut(...args),
    },
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
    authStateChangeCallback = undefined
    mockUnsubscribe.mockReset()
    mockGetSession.mockResolvedValue({ data: { session: null } })
    mockGetUser.mockResolvedValue({ data: { user: null }, error: null })
    mockSignOut.mockResolvedValue({ error: null })
    mockOnAuthStateChange.mockImplementation((callback: (_event: string, session: Session | null) => void) => {
      authStateChangeCallback = callback
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

  it('logout calls supabase signOut in normal mode', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(latestAuth?.loading).toBe(false))

    await act(async () => {
      await latestAuth?.logout()
    })

    expect(mockSignOut).toHaveBeenCalledWith()
  })

  it('logout in demo mode clears demo session without calling supabase signOut', async () => {
    render(
      <AuthProvider demoMode>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(latestAuth?.loading).toBe(false))

    await act(async () => {
      latestAuth?.loginAsDemo?.()
    })

    expect(latestAuth?.isDemoUser).toBe(true)

    await act(async () => {
      await latestAuth?.logout()
    })

    expect(mockSignOut).not.toHaveBeenCalled()
    expect(latestAuth?.isDemoUser).toBe(false)
    expect(latestAuth?.user).toBeNull()
  })

  it('updates user/session on auth state SIGNED_IN callback', async () => {
    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(latestAuth?.loading).toBe(false))

    const nextSession = {
      user: { id: 'next-user', email: 'next@example.com' },
    } as Session

    await act(async () => {
      authStateChangeCallback?.('SIGNED_IN', nextSession)
    })

    expect(latestAuth?.session).toEqual(nextSession)
    expect(latestAuth?.user?.id).toBe('next-user')
  })

  it('clears user/session on auth state SIGNED_OUT callback', async () => {
    mockGetSession.mockResolvedValue({
      data: {
        session: {
          user: { id: 'seed-user', email: 'seed@example.com' },
        },
      },
    })
    mockGetUser.mockResolvedValue({
      data: {
        user: {
          id: 'seed-user',
          email: 'seed@example.com',
        },
      },
      error: null,
    })

    render(
      <AuthProvider>
        <Probe />
      </AuthProvider>,
    )

    await waitFor(() => expect(latestAuth?.loading).toBe(false))
    expect(latestAuth?.user?.id).toBe('seed-user')

    await act(async () => {
      authStateChangeCallback?.('SIGNED_OUT', null)
    })

    expect(latestAuth?.session).toBeNull()
    expect(latestAuth?.user).toBeNull()
  })
})
