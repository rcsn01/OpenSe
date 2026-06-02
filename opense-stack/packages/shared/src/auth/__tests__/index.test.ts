import { beforeEach, describe, expect, it, vi } from 'vitest'

const mockSignUp = vi.fn()
const mockSignInWithPassword = vi.fn()
const mockSignInWithOAuth = vi.fn()
const mockSignOut = vi.fn()
const mockUpdateUser = vi.fn()
const mockRpc = vi.fn()

vi.mock('../../supabase', () => ({
  supabase: {
    auth: {
      signUp: (...args: unknown[]) => mockSignUp(...args),
      signInWithPassword: (...args: unknown[]) => mockSignInWithPassword(...args),
      signOut: () => mockSignOut(),
      updateUser: (...args: unknown[]) => mockUpdateUser(...args),
      signInWithOAuth: (...args: unknown[]) => mockSignInWithOAuth(...args),
    },
    from: () => ({
      select: () => ({
        eq: () => ({ single: vi.fn().mockResolvedValue({ data: { full_name: 'Test User' }, error: null }) }),
      }),
      update: () => ({
        eq: () => ({ error: null }),
      }),
    }),
    rpc: (...args: unknown[]) => mockRpc(...args),
  },
}))

import { hasUsers, signIn, signInWithGoogle, signOut, signUp, updatePassword } from '../index'

describe('shared auth api', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockSignInWithOAuth.mockResolvedValue({ data: {}, error: null })
    vi.unstubAllGlobals()
  })

  it('signUp rejects weak passwords before supabase call', async () => {
    await expect(signUp('test@example.com', 'weak')).rejects.toThrow()
    expect(mockSignUp).not.toHaveBeenCalled()
  })

  it('signUp calls supabase for strong passwords', async () => {
    mockSignUp.mockResolvedValue({ error: null })
    await signUp('test@example.com', 'MyStr0ng!Pass', { fullName: 'Test User' })

    expect(mockSignUp).toHaveBeenCalledWith({
      email: 'test@example.com',
      password: 'MyStr0ng!Pass',
      options: { data: { full_name: 'Test User', username: undefined } },
    })
  })

  it('signIn throws supabase auth errors', async () => {
    mockSignInWithPassword.mockResolvedValue({ error: { message: 'Invalid login credentials' } })
    await expect(signIn('test@example.com', 'wrong')).rejects.toThrow('Invalid login credentials')
  })

  it('signOut throws supabase sign out errors', async () => {
    mockSignOut.mockResolvedValue({ error: { message: 'Session not found' } })
    await expect(signOut()).rejects.toThrow('Session not found')
  })

  it('updatePassword rejects weak passwords', async () => {
    await expect(updatePassword('weak')).rejects.toThrow()
    expect(mockUpdateUser).not.toHaveBeenCalled()
  })

  it('hasUsers returns RPC boolean', async () => {
    mockRpc.mockResolvedValue({ data: true, error: null })
    await expect(hasUsers()).resolves.toBe(true)
  })

  it('opens the provider URL externally in desktop mode', async () => {
    const openExternal = vi.fn().mockResolvedValue(undefined)
    mockSignInWithOAuth.mockResolvedValue({
      data: { url: 'https://accounts.google.com/oauth' },
      error: null,
    })
    vi.stubGlobal('window', {
      location: {
        origin: 'opense://desktop',
        assign: vi.fn(),
      },
      __OPENSE_CONFIG__: {
        VITE_OPENSE_RUNTIME_TARGET: 'desktop',
        VITE_ACCOUNTS_URL: 'opense://desktop/accounts',
      },
      openseDesktop: { openExternal },
    })

    await signInWithGoogle('/login?returnTo=opense%3A%2F%2Fdesktop%2Fetl%2Fdashboard')

    expect(mockSignInWithOAuth).toHaveBeenCalledWith({
      provider: 'google',
      options: {
        redirectTo:
          'opense://desktop/accounts/login?returnTo=opense%3A%2F%2Fdesktop%2Fetl%2Fdashboard',
        skipBrowserRedirect: true,
        queryParams: {
          prompt: 'select_account',
        },
      },
    })
    expect(openExternal).toHaveBeenCalledWith('https://accounts.google.com/oauth')
  })
})
