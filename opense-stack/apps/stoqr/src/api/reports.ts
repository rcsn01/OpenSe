import { db, supabase } from '../supabaseClient'

type ReportProduct = {
  id: string
  name: string
  sku: string
  quantity_on_hand: number
  cost_price: number | null
  selling_price: number | null
  category: string | null
}

type ReportTransaction = {
  id: string
  transaction_type: string
  quantity_change: number
  created_at: string
  notes: string | null
  performed_by: string | null
  products: { id: string; name: string; sku: string; cost_price: number | null; selling_price: number | null; category: string | null } | { id: string; name: string; sku: string; cost_price: number | null; selling_price: number | null; category: string | null }[] | null
  profiles: { id: string; full_name: string | null; username: string | null } | null
}

const DAYS = 30
const formatDay = (date: Date) => date.toISOString().split('T')[0]

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | null => {
  if (!value) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

const buildSeries = (currentValue: number, deltasByDay: Record<string, number>) => {
  const series: { date: string; value: number }[] = []
  const today = new Date()
  const days: string[] = []

  for (let index = DAYS - 1; index >= 0; index -= 1) {
    const date = new Date(today)
    date.setDate(date.getDate() - index)
    days.push(formatDay(date))
  }

  const totalDelta = days.reduce((sum, day) => sum + (deltasByDay[day] ?? 0), 0)
  let running = currentValue - totalDelta

  days.forEach((day) => {
    running += deltasByDay[day] ?? 0
    series.push({ date: day, value: running })
  })

  return series
}

export type CreateReportSchedulePayload = {
  report_type: string
  cadence: string
  day_of_week: number
  day_of_month: number
  time_of_day: string
  recipients: string
}

export const fetchReportsData = async (companyId: string) => {
  const [{ data: productsData, error: productsError }, { data: transactionsData, error: transactionsError }, { data: schedulesData, error: schedulesError }] = await Promise.all([
    db
      .from('products')
      .select('id, name, sku, quantity_on_hand, cost_price, selling_price, category')
      .eq('company_id', companyId),
    db
      .from('inventory_transactions')
      .select(`
        id, transaction_type, quantity_change, created_at, notes, performed_by,
        products (id, name, sku, cost_price, selling_price, category)
      `)
      .eq('company_id', companyId)
      .gte('created_at', new Date(Date.now() - DAYS * 24 * 60 * 60 * 1000).toISOString())
      .order('created_at', { ascending: false }),
    db.from('report_schedules').select('*').eq('company_id', companyId),
  ])

  if (productsError) throw productsError
  if (transactionsError) throw transactionsError
  if (schedulesError) throw schedulesError

  const products = (productsData as ReportProduct[] | null) ?? []
  const transactionRows = (transactionsData as ReportTransaction[] | null) ?? []
  const performerIds = Array.from(
    new Set(transactionRows.map((transaction) => transaction.performed_by).filter(Boolean) as string[]),
  )

  let profilesById = new Map<string, { id: string; full_name: string | null; username: string | null }>()
  if (performerIds.length) {
    const { data: profileRows, error: profilesError } = await supabase
      .from('profiles')
      .select('id, full_name, username')
      .in('id', performerIds)

    if (profilesError) throw profilesError

    profilesById = new Map(
      (((profileRows as Array<{ id: string; full_name: string | null; username: string | null }>) ?? [])
        .map((profile) => [profile.id, profile])),
    )
  }

  const transactions = transactionRows.map((transaction) => ({
    ...transaction,
    products: normalizeSingle(transaction.products),
    profiles: transaction.performed_by ? (profilesById.get(transaction.performed_by) ?? null) : null,
  }))

  const currentValue = products.reduce(
    (sum, product) => sum + (product.quantity_on_hand ?? 0) * (product.cost_price ?? 0),
    0,
  )

  const deltasByDay: Record<string, number> = {}
  transactions.forEach((transaction) => {
    const day = formatDay(new Date(transaction.created_at))
    const val = (transaction.quantity_change ?? 0) * (transaction.products?.cost_price ?? 0)
    deltasByDay[day] = (deltasByDay[day] ?? 0) + val
  })

  return {
    products,
    transactions,
    schedules: schedulesData ?? [],
    series: buildSeries(currentValue, deltasByDay),
  }
}

export const createReportSchedule = async (
  companyId: string,
  payload: CreateReportSchedulePayload,
) => {
  const { error } = await db.from('report_schedules').insert({
    company_id: companyId,
    report_type: payload.report_type,
    cadence: payload.cadence,
    day_of_week: payload.cadence === 'weekly' ? payload.day_of_week : null,
    day_of_month: payload.cadence === 'monthly' ? payload.day_of_month : null,
    time_of_day: payload.time_of_day,
    recipients: payload.recipients.split(',').map((email) => email.trim()).filter(Boolean),
  })

  if (error) throw error
}

export const deleteReportSchedule = async (companyId: string, scheduleId: string) => {
  const { error } = await db
    .from('report_schedules')
    .delete()
    .eq('id', scheduleId)
    .eq('company_id', companyId)

  if (error) throw error
}
