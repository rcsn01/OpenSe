import { db, supabase } from '../supabaseClient'

export type Member = {
  id: string
  user_id: string
  role_id: string | null
  joined_at: string
  profiles?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null }
  roles?: { id: string; name: string }
}

export type Role = {
  id: string
  name: string
  description: string | null
}

export type Permission = {
  code: string
  description: string
}

export type CompanyInvitation = {
  id: string
  email: string
  created_at: string
}

export type TeamActivityEvent = {
  id: string
  actor_user_id: string | null
  event_type: string
  message: string | null
  metadata: Record<string, unknown>
  created_at: string
  profiles?: { id: string; full_name: string | null; username: string | null } | null
}

type CompanyInvitationRow = {
  id: string
  email: string
  created_at: string
}

export type TwoFactorStatus = {
  currentLevel: string | null
  nextLevel: string | null
  hasVerifiedFactor: boolean
  factors: Array<{ id: string; status: string; factor_type: string; friendly_name?: string | null }>
}

export const fetchTeamSettingsData = async (companyId: string) => {
  const [
    { data: memberData, error: memberError },
    { data: roleData, error: roleError },
    { data: permissionData, error: permissionError },
    { data: invitationData, error: invitationError },
  ] = await Promise.all([
    db
      .from('organisation_member_roles')
      .select('id, user_id, role_id, joined_at')
      .eq('company_id', companyId),
    db.from('roles').select('id, name, description').eq('company_id', companyId),
    db.from('app_permissions').select('code, description'),
    supabase
      .from('organisation_invites')
      .select('id, email, created_at')
      .eq('org_id', companyId)
      .is('accepted_at', null)
      .order('created_at', { ascending: false }),
  ])

  if (memberError) throw memberError
  if (roleError) throw roleError
  if (permissionError) throw permissionError
  if (invitationError) throw invitationError

  const rolesList = (roleData as Role[] | null) ?? []
  const membersBase = (memberData as Array<Pick<Member, 'id' | 'user_id' | 'role_id' | 'joined_at'>> | null) ?? []

  const uniqueUserIds = Array.from(new Set(membersBase.map((member) => member.user_id)))
  let profilesById = new Map<string, NonNullable<Member['profiles']>>()

  if (uniqueUserIds.length) {
    const { data: profileRows, error: profileError } = await supabase
      .from('profiles')
      .select('id, full_name, username, avatar_url')
      .in('id', uniqueUserIds)

    if (profileError) throw profileError

    profilesById = new Map(
      ((profileRows as NonNullable<Member['profiles']>[] | null) ?? []).map((profile) => [profile.id, profile]),
    )
  }

  const rolesById = new Map(rolesList.map((role) => [role.id, role]))
  const members = membersBase.map((member) => ({
    ...member,
    profiles: profilesById.get(member.user_id),
    roles: member.role_id ? rolesById.get(member.role_id) : undefined,
  })) as Member[]

  let rolePermissions: Record<string, string[]> = {}

  if (rolesList.length) {
    const { data: rolePermissionData, error: rolePermissionError } = await db
      .from('role_permissions')
      .select('role_id, permission_code')
      .in('role_id', rolesList.map((role) => role.id))

    if (rolePermissionError) throw rolePermissionError

    rolePermissions = {}
    rolePermissionData?.forEach((item) => {
      if (!rolePermissions[item.role_id]) rolePermissions[item.role_id] = []
      rolePermissions[item.role_id].push(item.permission_code)
    })
  }

  return {
    members,
    invitations: (invitationData as CompanyInvitationRow[] | null) ?? [],
    roles: rolesList,
    permissions: (permissionData as Permission[] | null) ?? [],
    rolePermissions,
  }
}

export const inviteCompanyMember = async (companyId: string, email: string, roleId: string) => {
  const { data, error: userError } = await supabase.auth.getUser()
  if (userError) throw userError

  const { error } = await supabase.from('organisation_invites').upsert({
    org_id: companyId,
    email,
    invited_by: data.user?.id ?? null,
  })

  void roleId

  if (error) throw error
}

export const updateCompanyMemberRole = async (memberId: string, roleId: string) => {
  const { data: targetMember, error: targetMemberError } = await db
    .from('organisation_member_roles')
    .select('id, user_id, company_id, role_id')
    .eq('id', memberId)
    .single()

  if (targetMemberError) throw targetMemberError

  const { data: ownerRole, error: ownerRoleError } = await db
    .from('roles')
    .select('id')
    .eq('company_id', targetMember.company_id)
    .eq('name', 'Owner')
    .single()

  if (ownerRoleError) throw ownerRoleError

  if (roleId === ownerRole.id || targetMember.role_id === ownerRole.id) {
    throw new Error('Owner role is system-managed and cannot be changed directly.')
  }

  const { error } = await db.from('organisation_member_roles').update({ role_id: roleId }).eq('id', memberId)
  if (error) throw error
}

export const saveRoleWithPermissions = async (
  role: Role,
  desiredPermissions: string[],
  initialPermissions: string[],
) => {
  const { error: roleError } = await db
    .from('roles')
    .update({ name: role.name, description: role.description })
    .eq('id', role.id)

  if (roleError) throw roleError

  const desired = new Set(desiredPermissions)
  const current = new Set(initialPermissions)
  const toDelete = Array.from(current).filter((code) => !desired.has(code))
  const toAdd = Array.from(desired).filter((code) => !current.has(code))

  if (toDelete.length) {
    const { error } = await db
      .from('role_permissions')
      .delete()
      .eq('role_id', role.id)
      .in('permission_code', toDelete)
    if (error) throw error
  }

  if (toAdd.length) {
    const { error } = await db.from('role_permissions').insert(
      toAdd.map((permission) => ({ role_id: role.id, permission_code: permission })),
    )
    if (error) throw error
  }
}

export const createRoleWithPermissions = async (
  companyId: string,
  payload: { name: string; description: string; perms: string[] },
) => {
  const { data, error } = await db
    .from('roles')
    .insert({ company_id: companyId, name: payload.name, description: payload.description })
    .select('id')
    .single()

  if (error) throw error

  if (data?.id && payload.perms.length) {
    const { error: permissionError } = await db.from('role_permissions').insert(
      payload.perms.map((permission) => ({ role_id: data.id, permission_code: permission })),
    )

    if (permissionError) throw permissionError
  }
}

export const updateRoleWithPermissions = async (
  roleId: string,
  payload: { name: string; description: string; permissionCodes: string[] },
) => {
  const { error: roleError } = await db
    .from('roles')
    .update({ name: payload.name, description: payload.description })
    .eq('id', roleId)

  if (roleError) throw roleError

  const { error: deleteError } = await db.from('role_permissions').delete().eq('role_id', roleId)
  if (deleteError) throw deleteError

  if (payload.permissionCodes.length > 0) {
    const { error: permissionError } = await db.from('role_permissions').insert(
      payload.permissionCodes.map((permissionCode) => ({ role_id: roleId, permission_code: permissionCode })),
    )

    if (permissionError) throw permissionError
  }
}

export const fetchTeamActivityEvents = async (companyId: string): Promise<TeamActivityEvent[]> => {
  const { data, error } = await db
    .from('activity_events')
    .select('id, actor_user_id, event_type, message, metadata, created_at')
    .eq('company_id', companyId)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw error

  const events = (data as TeamActivityEvent[] | null) ?? []
  const actorIds = Array.from(new Set(events.map((event) => event.actor_user_id).filter(Boolean))) as string[]

  if (actorIds.length === 0) return events

  const { data: profileRows, error: profileError } = await supabase
    .from('profiles')
    .select('id, full_name, username')
    .in('id', actorIds)

  if (profileError) throw profileError

  const profileMap = new Map(
    (((profileRows as Array<{ id: string; full_name: string | null; username: string | null }> | null) ?? [])).map((profile) => [profile.id, profile]),
  )

  return events.map((event) => ({
    ...event,
    profiles: event.actor_user_id ? (profileMap.get(event.actor_user_id) ?? null) : null,
  }))
}

export const fetchTwoFactorStatus = async (): Promise<TwoFactorStatus> => {
  const { data: aalData, error: aalError } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel()
  if (aalError) throw aalError

  const { data: factorData, error: factorError } = await supabase.auth.mfa.listFactors()
  if (factorError) throw factorError

  const allFactors = [...(factorData.totp ?? []), ...(factorData.phone ?? [])]
  const hasVerifiedFactor = allFactors.some((factor) => factor.status === 'verified')

  return {
    currentLevel: aalData.currentLevel,
    nextLevel: aalData.nextLevel,
    hasVerifiedFactor,
    factors: allFactors.map((factor) => ({
      id: factor.id,
      status: factor.status,
      factor_type: factor.factor_type,
      friendly_name: factor.friendly_name,
    })),
  }
}
