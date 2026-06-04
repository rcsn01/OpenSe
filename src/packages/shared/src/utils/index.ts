/**
 * Shared utility functions used across both ETL and StoQR apps.
 */

/**
 * Format a currency value in USD.
 */
export const formatCurrency = (value: number | null | undefined): string => {
  if (value == null) return '—'
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(value)
}

/**
 * Format a date/time string to locale representation.
 */
export const formatDateTime = (value: string | null | undefined): string => {
  if (!value) return '—'
  return new Date(value).toLocaleString()
}

/**
 * Safe number parse with a fallback.
 */
export const toNumber = (
  value: string | number | null | undefined,
  fallback = 0
): number => {
  if (value == null) return fallback
  const parsed = typeof value === 'number' ? value : Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}

/**
 * Simple CSV parsing helper.
 */
export const parseCsv = (
  content: string
): { headers: string[]; rows: string[][] } => {
  const normalizedContent = content.trim()
  if (!normalizedContent) {
    return { headers: [], rows: [] }
  }

  const parseLine = (line: string): string[] => {
    const result: string[] = []
    let current = ''
    let inQuotes = false

    for (let index = 0; index < line.length; index += 1) {
      const char = line[index]

      if (char === '"') {
        const nextChar = line[index + 1]
        if (inQuotes && nextChar === '"') {
          current += '"'
          index += 1
        } else {
          inQuotes = !inQuotes
        }
        continue
      }

      if (char === ',' && !inQuotes) {
        result.push(current.trim())
        current = ''
        continue
      }

      current += char
    }

    result.push(current.trim())
    return result
  }

  const lines = normalizedContent.split(/\r?\n/)
  const headers = parseLine(lines[0] ?? '')
  const rows = lines.slice(1).map((line) => parseLine(line))

  return { headers, rows }
}

/**
 * Class name merging utility (like clsx + tailwind-merge lite).
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}

export {
  DEFAULT_LOCAL_APP_RETURN_URLS,
  appendAppPath,
  buildAccountsAuthUrl,
  buildAccountsForwardQuery,
  buildAccountsOnboardingUrl,
  buildAccountsProfileUrl,
  buildAccountsSettingsUrl,
  buildConfiguredAccountsProfileUrl,
  buildConfiguredAccountsSettingsUrl,
  createAccountsRedirects,
  getConfiguredAccountsUrl,
  getSafeAccountsReturnTo,
  isSafeAccountsReturnTo,
  type AccountsReturnToValidationConfig,
  type AuthMode,
} from './authRedirect'
