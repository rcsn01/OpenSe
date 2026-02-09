import { supabase } from './supabaseClient'

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
  if (!pathOrUrl) return ''
  if (pathOrUrl.startsWith('http://') || pathOrUrl.startsWith('https://')) {
    return pathOrUrl
  }
  const { data } = supabase.storage.from('product-images').getPublicUrl(pathOrUrl)
  return data.publicUrl
}

export const parseCsv = (content: string) => {
  const lines = content
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)

  if (lines.length < 2) return { headers: [], rows: [] }

  const headers = lines[0].split(',').map((header) => header.trim())
  const rows = lines.slice(1).map((line) => {
    const values = line.split(',').map((value) => value.trim())
    return headers.reduce<Record<string, string>>((acc, header, index) => {
      acc[header] = values[index] ?? ''
      return acc
    }, {})
  })

  return { headers, rows }
}

export const toNumber = (value: string | number | null | undefined, fallback = 0) => {
  if (value === null || value === undefined || value === '') return fallback
  const parsed = Number(value)
  return Number.isNaN(parsed) ? fallback : parsed
}
