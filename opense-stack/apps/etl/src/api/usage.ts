import { db } from '../lib/supabase'

export type DailyUsageStat = {
  daily_date: string
  daily_total: number
  daily_success: number
  daily_failed: number
}

export type UsageSummary = {
  total: number
  success: number
  failed: number
  successRate: number
  dailyStats: DailyUsageStat[]
}

export type ActiveUser = {
  user_id: string
  email: string
  full_name: string | null
  execution_count: number
  last_active: string
}

export const getOrgUsageStats = async (orgId: string): Promise<UsageSummary> => {
  const { data, error } = await db
    .from('org_member_usage_stats')
    .select('daily_date, daily_total, daily_success, daily_failed')
    .eq('org_id', orgId)
    .order('daily_date', { ascending: true })

  if (error) {
    console.warn('[Usage] Org usage stats query failed:', error)
    return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }
  }

  if (!data || data.length === 0) {
    return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }
  }

  let total = 0, success = 0, failed = 0
  const dailyStats: DailyUsageStat[] = data.map((row: any) => {
    total += Number(row.daily_total) || 0
    success += Number(row.daily_success) || 0
    failed += Number(row.daily_failed) || 0
    return {
      daily_date: row.daily_date,
      daily_total: Number(row.daily_total) || 0,
      daily_success: Number(row.daily_success) || 0,
      daily_failed: Number(row.daily_failed) || 0,
    }
  })

  return {
    total,
    success,
    failed,
    successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
    dailyStats,
  }
}

export const getPersonalUsageStats = async (): Promise<UsageSummary> => {
  const { data, error } = await db
    .from('personal_usage_stats')
    .select('daily_date, daily_total, daily_success, daily_failed')
    .order('daily_date', { ascending: true })

  if (error) {
    console.warn('[Usage] Personal usage stats query failed:', error)
    return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }
  }

  if (!data || data.length === 0) {
    return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }
  }

  let total = 0, success = 0, failed = 0
  const dailyStats: DailyUsageStat[] = data.map((row: any) => {
    total += Number(row.daily_total) || 0
    success += Number(row.daily_success) || 0
    failed += Number(row.daily_failed) || 0
    return {
      daily_date: row.daily_date,
      daily_total: Number(row.daily_total) || 0,
      daily_success: Number(row.daily_success) || 0,
      daily_failed: Number(row.daily_failed) || 0,
    }
  })

  return {
    total,
    success,
    failed,
    successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
    dailyStats,
  }
}

export const getOrgActiveUsers = async (orgId: string): Promise<ActiveUser[]> => {
  const { data, error } = await db
    .from('org_active_users')
    .select('user_id, email, full_name, execution_count, last_active')
    .eq('org_id', orgId)
    .order('execution_count', { ascending: false })

  if (error) {
    console.warn('[Usage] Org active users query failed:', error)
    return []
  }

  return (data || []) as ActiveUser[]
}
