import { supabase } from '@repo/shared/supabase'

export interface OrgAuditEvent {
  id: string
  orgId: string
  actorUserId: string | null
  actorEmail: string | null
  actorFullName: string | null
  action: string
  appCode: string | null
  targetOrgMemberId: string | null
  targetUserEmail: string | null
  metadata: Record<string, unknown>
  createdAt: string
}

interface AccountsAuditEventRow {
  id: string
  org_id: string
  actor_user_id: string | null
  actor_email: string | null
  actor_full_name: string | null
  action: string
  app_code: string | null
  target_org_member_id: string | null
  target_user_email: string | null
  metadata: Record<string, unknown> | null
  created_at: string
}

export const listOrgAuditEvents = async (limit = 12): Promise<OrgAuditEvent[]> => {
  const boundedLimit = Math.min(Math.max(limit, 1), 200)
  const { data, error } = await supabase
    .from('account_org_audit_events')
    .select('id, org_id, actor_user_id, actor_email, actor_full_name, action, app_code, target_org_member_id, target_user_email, metadata, created_at')
    .order('created_at', { ascending: false })
    .limit(boundedLimit)
  if (error) throw error

  const rows = (data ?? []) as AccountsAuditEventRow[]
  return rows.map((row) => ({
    id: row.id,
    orgId: row.org_id,
    actorUserId: row.actor_user_id,
    actorEmail: row.actor_email,
    actorFullName: row.actor_full_name,
    action: row.action,
    appCode: row.app_code,
    targetOrgMemberId: row.target_org_member_id,
    targetUserEmail: row.target_user_email,
    metadata: row.metadata ?? {},
    createdAt: row.created_at,
  }))
}
