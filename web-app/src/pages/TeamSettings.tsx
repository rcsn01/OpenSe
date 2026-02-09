import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { ActivityLogsTab } from '../components/TeamSettings/ActivityLogsTab'
import { MembersTab } from '../components/TeamSettings/MembersTab'
import { RolesTab } from '../components/TeamSettings/RolesTab'

type Member = {
  id: string
  user_id: string
  role_id: string | null
  joined_at: string
  profiles?: { id: string; full_name: string | null; username: string | null; avatar_url: string | null }
  roles?: { id: string; name: string }
}

type Role = {
  id: string
  name: string
  description: string | null
}

type Permission = {
  code: string
  description: string
}

export const TeamSettings = () => {
  const { companyId } = useCompany()
  const [members, setMembers] = useState<Member[]>([])
  const [roles, setRoles] = useState<Role[]>([])
  const [permissions, setPermissions] = useState<Permission[]>([])
  const [rolePermissions, setRolePermissions] = useState<Record<string, string[]>>({})
  const [initialRolePermissions, setInitialRolePermissions] = useState<Record<string, string[]>>({})
  const [isLoading, setIsLoading] = useState(true)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)

  const loadData = async () => {
    if (!companyId) return
    setIsLoading(true)

    const [{ data: memberData }, { data: roleData }, { data: permissionData }] = await Promise.all([
      supabase
        .from('company_members')
        .select('id, user_id, role_id, joined_at, profiles (id, full_name, username, avatar_url), roles (id, name)')
        .eq('company_id', companyId),
      supabase.from('roles').select('id, name, description').eq('company_id', companyId),
      supabase.from('app_permissions').select('code, description'),
    ])

    const rolesList = (roleData as Role[]) ?? []
    const normalizedMembers = ((memberData as any[]) ?? []).map((member) => ({
      ...member,
      profiles: Array.isArray(member.profiles) ? member.profiles[0] : member.profiles,
      roles: Array.isArray(member.roles) ? member.roles[0] : member.roles,
    }))
    setMembers(normalizedMembers as Member[])
    setRoles(rolesList)
    setPermissions((permissionData as Permission[]) ?? [])

    if (rolesList.length) {
      const { data: rolePermissionData } = await supabase
        .from('role_permissions')
        .select('role_id, permission_code')
        .in(
          'role_id',
          rolesList.map((role) => role.id),
        )

      const map: Record<string, string[]> = {}
      rolePermissionData?.forEach((item) => {
        if (!map[item.role_id]) map[item.role_id] = []
        map[item.role_id].push(item.permission_code)
      })
      setRolePermissions(map)
      setInitialRolePermissions(map)
    }

    setIsLoading(false)
  }

  useEffect(() => {
    loadData()
  }, [companyId])

  const handleInvite = async (email: string, roleId: string) => {
    if (!companyId || !email || !roleId) return
    setInviteMessage(null)
    const { error } = await supabase.from('company_invitations').insert({
      company_id: companyId,
      email,
      role_id: roleId,
    })
    setInviteMessage(error ? error.message : `Invitation sent to ${email}.`)
  }

  const handleRoleChange = async (memberId: string, roleId: string) => {
    await supabase.from('company_members').update({ role_id: roleId }).eq('id', memberId)
    loadData()
  }

  const handleRoleSave = async (role: Role) => {
    await supabase
      .from('roles')
      .update({ name: role.name, description: role.description })
      .eq('id', role.id)

    const desired = new Set(rolePermissions[role.id] ?? [])
    const current = new Set(initialRolePermissions[role.id] ?? [])

    const toDelete = Array.from(current).filter((code) => !desired.has(code))
    const toAdd = Array.from(desired).filter((code) => !current.has(code))

    if (toDelete.length) {
      await supabase
        .from('role_permissions')
        .delete()
        .eq('role_id', role.id)
        .in('permission_code', toDelete)
    }

    if (toAdd.length) {
      await supabase.from('role_permissions').insert(
        toAdd.map((permission) => ({ role_id: role.id, permission_code: permission })),
      )
    }
    // Refresh to sync initial state
    loadData()
  }

  const handleCreateRole = async (name: string, description: string, perms: string[]) => {
    if (!companyId || !name) return
    const { data, error } = await supabase
      .from('roles')
      .insert({ company_id: companyId, name, description })
      .select('id')
      .single()

    if (!error && data?.id && perms.length) {
      await supabase.from('role_permissions').insert(
        perms.map((permission) => ({ role_id: data.id, permission_code: permission })),
      )
    }
    loadData()
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to manage your team."
      loadingMessage="Loading team settings..."
    >
      <Tabs
        tabs={[
          {
            id: 'members',
            label: 'Members',
            content: (
              <MembersTab
                members={members}
                roles={roles}
                onRoleChange={handleRoleChange}
                onInvite={handleInvite}
                inviteMessage={inviteMessage}
              />
            ),
          },
          {
            id: 'roles',
            label: 'Roles',
            content: (
              <RolesTab
                roles={roles}
                setRoles={setRoles}
                permissions={permissions}
                rolePermissions={rolePermissions}
                setRolePermissions={setRolePermissions}
                onSaveRole={handleRoleSave}
                onCreateRole={handleCreateRole}
              />
            ),
          },
          {
            id: 'activity',
            label: 'Activity Logs',
            content: <ActivityLogsTab />,
          },
        ]}
      />
    </BasePage>
  )
}