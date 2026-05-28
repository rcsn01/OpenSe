import { afterEach, describe, expect, it, vi } from 'vitest'
import { getSignupSuccessMessage } from '../../lib/signupSuccessMessage'

const setRuntimeConfig = (config?: Record<string, string>) => {
  vi.stubGlobal('window', {
    __OPENSE_CONFIG__: config,
  })
}

describe('SharedSignupRoutePage', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('uses a generic signup success message when Google Auth is disabled', () => {
    setRuntimeConfig({ VITE_GOOGLE_AUTH_ENABLED: 'false' })

    expect(getSignupSuccessMessage()).toBe('Account created. Sign in to continue.')
  })

  it('keeps the email confirmation message when Google Auth is enabled', () => {
    setRuntimeConfig({ VITE_GOOGLE_AUTH_ENABLED: 'true' })

    expect(getSignupSuccessMessage()).toBe(
      'Please check your email to confirm your account, then sign in.',
    )
  })
})
