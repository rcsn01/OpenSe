export const formatShortDate = (value: string | null) => {
  if (!value) return 'No date'
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric' }).format(new Date(`${value}T00:00:00`))
}

export const toDate = (value: string | null | undefined) =>
  value ? new Date(`${value}T00:00:00`) : null

export const dayKey = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const addDays = (date: Date, days: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + days)
  return next
}

export const startOfMonth = (date: Date) => new Date(date.getFullYear(), date.getMonth(), 1)

export const buildCalendarDays = (month: Date) => {
  const first = startOfMonth(month)
  const offset = first.getDay()
  const start = addDays(first, -offset)
  return Array.from({ length: 42 }, (_, index) => addDays(start, index))
}

export const formatDateTime = (value: string | null) => {
  if (!value) return 'Not scheduled'
  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(value))
}

export const formatLongDate = (value: string | null, fallback = 'Not set') => {
  if (!value) return fallback
  return new Intl.DateTimeFormat(undefined, { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date(value))
}
