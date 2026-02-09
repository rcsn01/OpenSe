import { supabase, db } from '../lib/supabase'

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

/**
 * Fetches usage stats for an organisation using the RPC.
 * Falls back to a direct query if the RPC is not available.
 */
export const getOrgUsageStats = async (orgId: string): Promise<UsageSummary> => {
  try {
    // Try the RPC first
    const { data, error } = await db.rpc('get_org_member_usage_stats', {
      target_org_id: orgId,
    })

    if (error) throw error

    if (!data || data.length === 0) {
      return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }
    }

    // Aggregate totals from daily rows
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
  } catch {
    // Fallback: direct query if RPC not deployed yet
    return getOrgUsageStatsDirect(orgId)
  }
}

/**
 * Direct query fallback - queries workflow_executions directly.
 */
const getOrgUsageStatsDirect = async (orgId: string): Promise<UsageSummary> => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data, error } = await db
    .from('workflow_executions')
    .select('id, status, started_at, workflow_id, workflows!inner(org_id)')
    .eq('workflows.org_id', orgId)
    .gte('started_at', thirtyDaysAgo.toISOString())
    .order('started_at', { ascending: true })

  if (error) {
    console.warn('[Usage] Direct query failed:', error)
    return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }
  }

  const executions = data || []
  const total = executions.length
  const success = executions.filter((e: any) => e.status === 'success').length
  const failed = executions.filter((e: any) => e.status === 'failed').length

  // Group by date
  const byDate = new Map<string, { total: number; success: number; failed: number }>()
  for (const exec of executions) {
    const date = new Date(exec.started_at).toISOString().split('T')[0]
    const existing = byDate.get(date) || { total: 0, success: 0, failed: 0 }
    existing.total++
    if ((exec as any).status === 'success') existing.success++
    if ((exec as any).status === 'failed') existing.failed++
    byDate.set(date, existing)
  }

  const dailyStats: DailyUsageStat[] = Array.from(byDate.entries()).map(([date, stats]) => ({
    daily_date: date,
    daily_total: stats.total,
    daily_success: stats.success,
    daily_failed: stats.failed,
  }))

  return {
    total,
    success,
    failed,
    successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
    dailyStats,
  }
}

/**
 * Fetches personal usage stats for the authenticated user (org_id IS NULL).
 */
export const getPersonalUsageStats = async (): Promise<UsageSummary> => {
  try {
    const { data, error } = await db.rpc('get_personal_usage_stats')

    if (error) throw error

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
  } catch {
    // Fallback: direct query
    return getPersonalUsageStatsDirect()
  }
}

/**
 * Direct query fallback for personal usage stats.
 */
const getPersonalUsageStatsDirect = async (): Promise<UsageSummary> => {
  const thirtyDaysAgo = new Date()
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }

  const { data, error } = await db
    .from('workflow_executions')
    .select('id, status, started_at, workflow_id, workflows!inner(org_id, user_id)')
    .eq('workflows.user_id', user.id)
    .is('workflows.org_id', null)
    .gte('started_at', thirtyDaysAgo.toISOString())
    .order('started_at', { ascending: true })

  if (error) {
    console.warn('[Usage] Personal direct query failed:', error)
    return { total: 0, success: 0, failed: 0, successRate: 0, dailyStats: [] }
  }

  const executions = data || []
  const total = executions.length
  const success = executions.filter((e: any) => e.status === 'success').length
  const failed = executions.filter((e: any) => e.status === 'failed').length

  const byDate = new Map<string, { total: number; success: number; failed: number }>()
  for (const exec of executions) {
    const date = new Date(exec.started_at).toISOString().split('T')[0]
    const existing = byDate.get(date) || { total: 0, success: 0, failed: 0 }
    existing.total++
    if ((exec as any).status === 'success') existing.success++
    if ((exec as any).status === 'failed') existing.failed++
    byDate.set(date, existing)
  }

  const dailyStats: DailyUsageStat[] = Array.from(byDate.entries()).map(([date, stats]) => ({
    daily_date: date,
    daily_total: stats.total,
    daily_success: stats.success,
    daily_failed: stats.failed,
  }))

  return {
    total,
    success,
    failed,
    successRate: total > 0 ? Math.round((success / total) * 1000) / 10 : 0,
    dailyStats,
  }
}

/**
 * Fetches active users for an organisation.
 */
export const getOrgActiveUsers = async (orgId: string): Promise<ActiveUser[]> => {
  try {
    const { data, error } = await db.rpc('get_org_active_users', {
      target_org_id: orgId,
    })
    if (error) throw error
    return (data || []) as ActiveUser[]
  } catch {
    // Fallback
    return []
  }
}
