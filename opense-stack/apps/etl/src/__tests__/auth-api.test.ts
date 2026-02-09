/**
 * Test suite for api/auth.ts
 *
 * Tests the refactored signUp and updatePassword functions
 * which now enforce password strength (Audit S2).
 *
 * Mocks the Supabase client to isolate API logic from network calls.
 */
import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock Supabase before importing the module under test
const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignOut = vi.fn()
const mockUpdateUser = vi.fn()
const mockRpc = vi.fn()
const mockSingle = vi.fn()

vi.mock('../lib/supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signInWithOAuth: vi.fn().mockResolvedValue({ error: null }),
    },
    from: () => ({
      select: () => ({
        eq: () => ({
          single: () => mockSingle(),
        }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

// Import AFTER mock is set up
import { signUp, signIn, signOut, updatePassword, hasUsers } from '../api/auth'

beforeEach(() => {
  vi.clearAllMocks()
})

describe('signUp', () => {
  describe('happy path', () => {
    it('calls supabase.auth.signUp when password is strong enough', async () => {
      mockSignUp.mockResolvedValue({ error: null })

      await signUp('test@example.com', 'MyStr0ng!Pass')
      expect(mockSignUp).toHaveBeenCalledWith({
        email: 'test@example.com',
        password: 'MyStr0ng!Pass',
      })
    })
  })

  describe('error handling - password strength (Audit S2)', () => {
    it('rejects weak password before calling Supabase', async () => {
      await expect(signUp('test@example.com', 'weak')).rejects.toThrow()
      // Should NOT have called Supabase at all
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('rejects password without uppercase', async () => {
      await expect(signUp('test@example.com', 'myp@ssw0rd')).rejects.toThrow('uppercase')
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('rejects password without digit', async () => {
      await expect(signUp('test@example.com', 'MyP@ssword!')).rejects.toThrow('digit')
      expect(mockSignUp).not.toHaveBeenCalled()
    })

    it('rejects password without special character', async () => {
      await expect(signUp('test@example.com', 'MyPassw0rd')).rejects.toThrow('special')
      expect(mockSignUp).not.toHaveBeenCalled()
    })
  })

  describe('error handling - Supabase errors', () => {
    it('throws Supabase error when sign up fails', async () => {
      mockSignUp.mockResolvedValue({
        error: { message: 'User already registered' },
      })

      await expect(signUp('test@example.com', 'MyStr0ng!Pass')).rejects.toThrow(
        'User already registered'
      )
    })
  })
})

describe('signIn', () => {
  it('calls supabase signInWithPassword', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: null })
    await signIn('test@example.com', 'password')
    expect(mockSignInWithPassword).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'password',
    })
  })

  it('throws on authentication failure', async () => {
    mockSignInWithPassword.mockResolvedValue({
      error: { message: 'Invalid login credentials' },
    })
    await expect(signIn('test@example.com', 'wrong')).rejects.toThrow(
      'Invalid login credentials'
    )
  })
})

describe('signOut', () => {
  it('calls supabase signOut', async () => {
    mockSignOut.mockResolvedValue({ error: null })
    await signOut()
    expect(mockSignOut).toHaveBeenCalled()
  })

  it('throws on sign out error', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Session not found' } })
    await expect(signOut()).rejects.toThrow('Session not found')
  })
})

describe('updatePassword', () => {
  it('enforces password strength before updating', async () => {
    await expect(updatePassword('weak')).rejects.toThrow()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('calls supabase updateUser with strong password', async () => {
    mockUpdateUser.mockResolvedValue({ error: null })
    await updatePassword('NewStr0ng!Pass')
    expect(mockUpdateUser).toHaveBeenCalledWith({ password: 'NewStr0ng!Pass' })
  })
})

describe('hasUsers', () => {
  it('returns true when users exist', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    const result = await hasUsers()
    expect(result).toBe(true)
  })

  it('returns false when no users exist', async () => {
    mockRpc.mockResolvedValue({ data: false, error: null })
    const result = await hasUsers()
    expect(result).toBe(false)
  })

  it('throws on RPC error', async () => {
    mockRpc.mockResolvedValue({ data: null, error: { message: 'RPC failed' } })
    await expect(hasUsers()).rejects.toThrow('RPC failed')
  })
})
