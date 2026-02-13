import { describe, expect, it } from 'vitest'
import { validatePassword } from '../validation'

describe('validatePassword', () => {
  it('accepts a strong password', () => {
    const result = validatePassword('MyP@ssw0rd!')
    expect(result.valid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  it('rejects a weak password with multiple errors', () => {
    const result = validatePassword('weak')
    expect(result.valid).toBe(false)
    expect(result.errors.length).toBeGreaterThan(1)
  })

  it('requires a special character', () => {
    const result = validatePassword('MyPassw0rd')
    expect(result.valid).toBe(false)
    expect(result.errors).toContain('Password must contain at least one special character.')
  })
})
