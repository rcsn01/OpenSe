import Papa from 'papaparse'

import { getProductImagePublicUrl } from './api/storage'

export const formatCurrency = (value: number | null | undefined) => {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return '—'
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 2,
  }).format(value)
}

export const formatDateTime = (value: string | null | undefined) => {
  if (!value) return '—'
  const date = new Date(value)
  return date.toLocaleString()
}

export const getPublicImageUrl = (pathOrUrl: string) => {
  return getProductImagePublicUrl(pathOrUrl)
}

export const parseCsv = (content: string) => {
  const parsed = Papa.parse<Record<string, string | undefined>>(content, {
    header: true,
    skipEmptyLines: 'greedy',
    transformHeader: (header) => header.trim(),
    transform: (value) => value.trim(),
  })

  const headers = (parsed.meta.fields ?? []).filter(Boolean)
  const rows = parsed.data.map((row) => headers.reduce<Record<string, string>>((acc, header) => {
    acc[header] = row[header] ?? ''
    return acc
  }, {}))

  return { headers, rows }
}

export const toNumber = (value: string | number | null | undefined, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}
