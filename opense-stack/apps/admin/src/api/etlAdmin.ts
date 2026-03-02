import { supabase } from '@repo/shared/supabase'

const db = supabase

export type OrgRow = {
  id: string
  name: string
  created_at: string | null
  status: 'active' | 'suspended'
  owner?: { email: string | null; full_name: string | null } | null
  member_count?: number | null
}

export type UserOrgMembership = {
  org_id: string
  org_name: string
  role: 'owner' | 'admin' | 'editor' | 'member'
}

export type AdminUserRow = {
  id: string
  email: string | null
  full_name: string | null
  created_at?: string
  super_admin_members?: { user_id: string }[]
  memberships?: UserOrgMembership[]
}

export type MemberRow = {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'member'
  profiles?: {
    email: string | null
    full_name: string | null
  } | null
}

export type AdminAuditEventRow = {
  id: string
  org_id: string
  org_name: string
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

export type AdminWorkflowRow = {
  id: string
  name: string
  description: string | null
  created_at: string | null
  owner_id: string
  org_id: string | null
  is_template: boolean
  node_count: number
}

type AdminOrgRpcRow = {
  id: string
  name: string
  created_at: string | null
  status: 'active' | 'suspended'
  owner_email: string | null
  owner_full_name: string | null
  member_count: number | null
}

type AdminUserRpcRow = {
  id: string
  email: string | null
  full_name: string | null
  created_at: string | null
  is_super_admin: boolean
  memberships: Array<{
    org_id: string
    org_name: string
    role: 'owner' | 'admin' | 'editor' | 'member'
  }> | null
}

type OrgMemberRpcRow = {
  id: string
  user_id: string
  role: 'owner' | 'admin' | 'editor' | 'member'
  email: string | null
  full_name: string | null
}

type AdminWorkflowRpcRow = {
  id: string
  name: string
  description: string | null
  created_at: string | null
  owner_id: string
  org_id: string | null
  is_template: boolean
  node_count: number | null
}

const normalizeAdminWorkflows = (rows: AdminWorkflowRpcRow[]): AdminWorkflowRow[] =>
  rows.map((row) => ({
    ...row,
    node_count: row.node_count ?? 0,
  }))

export const listAdminOrgs = async (): Promise<OrgRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_organisations')

  if (error) throw error

  const rows = (data || []) as AdminOrgRpcRow[]

  return rows.map((org) => ({
    id: org.id,
    name: org.name,
    created_at: org.created_at,
    status: org.status,
    owner: {
      email: org.owner_email,
      full_name: org.owner_full_name,
    },
    member_count: org.member_count,
  })) as OrgRow[]
}

export const listAdminUsers = async (): Promise<AdminUserRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_users')
  if (error) throw error

  const rows = (data || []) as AdminUserRpcRow[]

  return rows.map((row) => ({
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    created_at: row.created_at ?? undefined,
    super_admin_members: row.is_super_admin ? [{ user_id: row.id }] : [],
    memberships: row.memberships ?? [],
  }))
}

export const listOrganisationMembers = async (orgId: string): Promise<MemberRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_organisation_members', { p_org_id: orgId })

  if (error) throw error

  const rows = (data || []) as OrgMemberRpcRow[]

  return rows.map((member) => ({
    id: member.id,
    role: member.role,
    user_id: member.user_id,
    profiles: {
      email: member.email,
      full_name: member.full_name,
    },
  })) as MemberRow[]
}

export const listAdminAuditEvents = async (orgId: string | null, limit = 50): Promise<AdminAuditEventRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_audit_events', {
    p_org_id: orgId,
    p_limit: limit,
  })

  if (error) throw error

  return (data ?? []) as AdminAuditEventRow[]
}

export const listGalleryTemplates = async (): Promise<AdminWorkflowRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_etl_workflows', { p_only_templates: true })
  if (error) throw error

  const rows = (data ?? []) as AdminWorkflowRpcRow[]
  return normalizeAdminWorkflows(rows)
}

export const listAllWorkflowsForAdmin = async (): Promise<AdminWorkflowRow[]> => {
  const { data, error } = await supabase.rpc('admin_list_etl_workflows', { p_only_templates: false })
  if (error) throw error

  const rows = (data ?? []) as AdminWorkflowRpcRow[]
  return normalizeAdminWorkflows(rows)
}

export const addWorkflowToGallery = async (workflowId: string) => {
  const { data, error } = await supabase.rpc('admin_set_etl_workflow_template_status', {
    p_workflow_id: workflowId,
    p_is_template: true,
  })
  if (error) throw error
  return data
}

export const removeWorkflowFromGallery = async (workflowId: string) => {
  const { data, error } = await supabase.rpc('admin_set_etl_workflow_template_status', {
    p_workflow_id: workflowId,
    p_is_template: false,
  })
  if (error) throw error
  return data
}

const findProfileByEmail = async (email: string) => {
  const { data, error } = await supabase
    .from('profiles')
    .select('id, email, full_name')
    .eq('email', email)
    .limit(1)

  if (error) throw error
  return data?.[0] ?? null
}

const userHasAnyMembership = async (userId: string) => {
  const { data, error } = await db.from('organisation_members').select('id').eq('user_id', userId).limit(1)
  if (error) throw error
  return (data?.length ?? 0) > 0
}

const addOrganisationMember = async (orgId: string, userId: string, role: 'admin' | 'editor' | 'member') => {
  const { error } = await db.from('organisation_members').insert({ org_id: orgId, user_id: userId, role })
  if (error) throw error
}

export const createOrganisationWithOwner = async (orgName: string, ownerEmail: string) => {
  const owner = await findProfileByEmail(ownerEmail.trim().toLowerCase())
  if (!owner) throw new Error('User not found. Ask them to sign up first.')

  const alreadyMember = await userHasAnyMembership(owner.id)
  if (alreadyMember) throw new Error('User is already assigned to an organisation.')

  const { data: org, error: orgError } = await db
    .from('organisations')
    .insert({ name: orgName, owner_id: owner.id })
    .select('id, name, owner_id, created_at')
    .single()

  if (orgError) throw orgError
  return org
}

export const renameOrganisation = async (orgId: string, name: string) => {
  const { error } = await db.from('organisations').update({ name }).eq('id', orgId)
  if (error) throw error
}

export const changeOrganisationOwner = async (orgId: string, email: string) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  const { data: memberships, error: membershipError } = await db
    .from('organisation_members')
    .select('org_id')
    .eq('user_id', profile.id)

  if (membershipError) throw membershipError

  const otherOrg = (memberships ?? []).find((item: { org_id: string }) => item.org_id !== orgId)
  if (otherOrg) throw new Error('User is already a member of another organisation.')

  const { error: ownerError } = await db.from('organisations').update({ owner_id: profile.id }).eq('id', orgId)
  if (ownerError) throw ownerError
}

export const inviteMemberToOrganisation = async (
  orgId: string,
  email: string,
  role: 'admin' | 'editor' | 'member'
) => {
  const profile = await findProfileByEmail(email.trim().toLowerCase())
  if (!profile) throw new Error('User not found')

  const alreadyMember = await userHasAnyMembership(profile.id)
  if (alreadyMember) throw new Error('User is already assigned to an organisation.')

  await addOrganisationMember(orgId, profile.id, role)
}

export const deleteOrganisation = async (orgId: string) => {
  const { error } = await db.from('organisations').delete().eq('id', orgId)
  if (error) throw error
}

export const deleteOrganisationMember = async (memberId: string) => {
  const { error } = await db.from('organisation_members').delete().eq('id', memberId)
  if (error) throw error
}

export const updateUserProfile = async (userId: string, updates: { full_name?: string; email?: string }) => {
  const { error } = await supabase.from('profiles').update(updates).eq('id', userId)
  if (error) throw error
}

const callUserAdminAction = async (body: Record<string, unknown>) => {
  const { data, error } = await supabase.functions.invoke('admin-user-management', { body })
  if (error) throw error
  if (data?.error) throw new Error(data.error)
  return data
}

export const createAdminUser = async (email: string, password: string, fullName: string) =>
  callUserAdminAction({ action: 'create', email, password, fullName })

export const resetAdminUserPassword = async (targetUserId: string, newPassword: string) =>
  callUserAdminAction({ action: 'reset-password', targetUserId, newPassword })

export const deleteAdminUser = async (targetUserId: string) =>
  callUserAdminAction({ action: 'delete', targetUserId })
