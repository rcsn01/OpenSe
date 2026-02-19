import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockGetSession = vi.fn()
const mockOnAuthStateChange = vi.fn()
const mockUnsubscribe = vi.fn()
let authStateCallback: ((event: string, session: unknown) => void) | undefined

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      getSession: (...args: unknown[]) => mockGetSession(...args),
      onAuthStateChange: (...args: unknown[]) => mockOnAuthStateChange(...args),
    },
  },
}))

import { useSession } from '../useSession'

beforeEach(() => {
  vi.clearAllMocks()
  authStateCallback = undefined

  mockOnAuthStateChange.mockImplementation((callback: (event: string, session: unknown) => void) => {
    authStateCallback = callback
    return {
      data: {
        subscription: {
          unsubscribe: mockUnsubscribe,
        },
      },
    }
  })
})

describe('useSession', () => {
  it('loads initial session and clears loading state', async () => {
    const initialSession = { access_token: 'token-1' }
    mockGetSession.mockResolvedValue({ data: { session: initialSession } })

    const { result } = renderHook(() => useSession())

    expect(result.current.isLoading).toBe(true)

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    expect(result.current.session).toEqual(initialSession)
  })

  it('updates session on auth state changes', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { result } = renderHook(() => useSession())

    await waitFor(() => {
      expect(result.current.isLoading).toBe(false)
    })

    const nextSession = { access_token: 'token-2' }

    await act(async () => {
      authStateCallback?.('SIGNED_IN', nextSession)
    })

    expect(result.current.session).toEqual(nextSession)
  })

  it('unsubscribes auth listener on unmount', async () => {
    mockGetSession.mockResolvedValue({ data: { session: null } })

    const { unmount } = renderHook(() => useSession())

    await waitFor(() => {
      expect(mockOnAuthStateChange).toHaveBeenCalledTimes(1)
    })

    unmount()

    expect(mockUnsubscribe).toHaveBeenCalledTimes(1)
  })
})
