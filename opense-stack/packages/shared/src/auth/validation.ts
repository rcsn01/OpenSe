export interface PasswordValidationResult {
  valid: boolean
  errors: string[]
}

const PASSWORD_MIN_LENGTH = 8
const PASSWORD_MAX_LENGTH = 128

export const validatePassword = (password: string): PasswordValidationResult => {
  const errors: string[] = []

  if (!password || typeof password !== 'string') {
    return { valid: false, errors: ['Password is required.'] }
  }

  if (password.length < PASSWORD_MIN_LENGTH) {
    errors.push(`Password must be at least ${PASSWORD_MIN_LENGTH} characters.`)
  }
  if (password.length > PASSWORD_MAX_LENGTH) {
    errors.push(`Password must be at most ${PASSWORD_MAX_LENGTH} characters.`)
  }
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter.')
  }
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter.')
  }
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one digit.')
  }
  if (!/[^a-zA-Z0-9]/.test(password)) {
    errors.push('Password must contain at least one special character.')
  }

  return { valid: errors.length === 0, errors }
}
