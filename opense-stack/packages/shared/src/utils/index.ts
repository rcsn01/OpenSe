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
  const lines = content.trim().split('\n')
  const headers = lines[0]?.split(',').map((h) => h.trim()) ?? []
  const rows = lines.slice(1).map((line) => line.split(',').map((c) => c.trim()))
  return { headers, rows }
}

/**
 * Class name merging utility (like clsx + tailwind-merge lite).
 */
export const cn = (...classes: (string | undefined | null | false)[]): string => {
  return classes.filter(Boolean).join(' ')
}
