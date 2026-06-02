import { afterEach, describe, expect, it, vi } from 'vitest'
import { isGoogleAuthEnabled } from '../googleAuth'

const setRuntimeConfig = (config?: Record<string, string>) => {
  vi.stubGlobal('window', {
    __OPENSE_CONFIG__: config,
  })
}

describe('Google Auth runtime flag', () => {
  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('is enabled only when the runtime flag is true', () => {
    setRuntimeConfig({ VITE_GOOGLE_AUTH_ENABLED: 'true' })

    expect(isGoogleAuthEnabled()).toBe(true)
  })

  it('is disabled when the runtime flag is false', () => {
    setRuntimeConfig({ VITE_GOOGLE_AUTH_ENABLED: 'false' })

    expect(isGoogleAuthEnabled()).toBe(false)
  })

  it('is disabled when the runtime flag is missing', () => {
    setRuntimeConfig({})

    expect(isGoogleAuthEnabled()).toBe(false)
  })
})
