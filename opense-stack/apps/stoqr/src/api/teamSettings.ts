import { db } from '../supabaseClient'

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

const normalizeSingle = <T>(value: T | T[] | null | undefined): T | undefined => {
  if (!value) return undefined
  return Array.isArray(value) ? value[0] : value
}

export const fetchTeamSettingsData = async (companyId: string) => {
  const [{ data: memberData, error: memberError }, { data: roleData, error: roleError }, { data: permissionData, error: permissionError }] = await Promise.all([
    db
      .from('company_members')
      .select('id, user_id, role_id, joined_at, profiles (id, full_name, username, avatar_url), roles (id, name)')
      .eq('company_id', companyId),
    db.from('roles').select('id, name, description').eq('company_id', companyId),
    db.from('app_permissions').select('code, description'),
  ])

  if (memberError) throw memberError
  if (roleError) throw roleError
  if (permissionError) throw permissionError

  const rolesList = (roleData as Role[] | null) ?? []
  const members = ((memberData as any[] | null) ?? []).map((member) => ({
    ...member,
    profiles: normalizeSingle(member.profiles),
    roles: normalizeSingle(member.roles),
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
    roles: rolesList,
    permissions: (permissionData as Permission[] | null) ?? [],
    rolePermissions,
  }
}

export const inviteCompanyMember = async (companyId: string, email: string, roleId: string) => {
  const { error } = await db.from('company_invitations').insert({
    company_id: companyId,
    email,
    role_id: roleId,
  })

  if (error) throw error
}

export const updateCompanyMemberRole = async (memberId: string, roleId: string) => {
  const { error } = await db.from('company_members').update({ role_id: roleId }).eq('id', memberId)
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
