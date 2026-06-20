import { isAllowedOrigin } from './cors.ts'

export type AppCode = 'etl' | 'open-kb' | 'stoqr'

export const parseAppCode = (value: unknown, fallback: AppCode = 'etl'): AppCode => {
  const appCode = typeof value === 'string' ? value : fallback
  if (appCode !== 'etl' && appCode !== 'open-kb' && appCode !== 'stoqr') {
    throw new Error('appCode must be etl, open-kb, or stoqr')
  }
  return appCode
}

export const parseTierSeatLimit = (tier: unknown): number | null => {
  if (tier === 'tier-1') return 5
  if (tier === 'tier-2') return 15
  if (tier === 'tier-3') return 50
  return null
}

export const parseSeatLimit = (explicitSeatLimit: unknown, tier: unknown, options: { allowDefaultZero?: boolean } = {}) => {
  const numericSeatLimit = Number(explicitSeatLimit)
  if (Number.isInteger(numericSeatLimit) && numericSeatLimit >= 0) {
    return numericSeatLimit
  }

  const tierSeatLimit = parseTierSeatLimit(tier)
  if (tierSeatLimit !== null) return tierSeatLimit
  if (options.allowDefaultZero) return 0

  throw new Error('seatLimit must be provided as non-negative integer or tier')
}

export const parseAllowedRedirectUrl = (value: unknown, fieldName: string): string => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`)
  }

  let url: URL
  try {
    url = new URL(value)
  } catch {
    throw new Error(`${fieldName} must be a valid absolute URL`)
  }

  if (url.protocol !== 'https:' && !url.hostname.startsWith('localhost') && url.hostname !== '127.0.0.1') {
    throw new Error(`${fieldName} must use HTTPS`)
  }

  if (!isAllowedOrigin(url.origin)) {
    throw new Error(`${fieldName} origin is not allowed`)
  }

  return url.toString()
}

export const parsePositivePercent = (value: unknown, fieldName: string) => {
  const percent = Number(value)
  if (!Number.isFinite(percent) || percent <= 0 || percent > 100) {
    throw new Error(`${fieldName} must be greater than 0 and no more than 100`)
  }
  return percent
}

export const parseNonNegativeInteger = (value: unknown, fieldName: string) => {
  const number = Number(value)
  if (!Number.isInteger(number) || number < 0) {
    throw new Error(`${fieldName} must be a non-negative integer`)
  }
  return number
}

export const parseEmail = (value: unknown) => {
  if (typeof value !== 'string' || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim())) {
    throw new Error('email must be a valid email address')
  }
  return value.trim().toLowerCase()
}

export const parsePassword = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string' || value.length < 12) {
    throw new Error(`${fieldName} must be at least 12 characters`)
  }
  return value
}

export const parseNonEmptyString = (value: unknown, fieldName: string) => {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`)
  }
  return value.trim()
}
