import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'

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
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string | null>(null)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(true)

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
    setInviteRole(rolesList[0]?.id ?? null)

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

  const handleInvite = async () => {
    if (!companyId || !inviteEmail || !inviteRole) return
    setInviteMessage(null)
    const { error } = await supabase.from('company_invitations').insert({
      company_id: companyId,
      email: inviteEmail,
      role_id: inviteRole,
    })

    setInviteMessage(error ? error.message : 'Invitation sent.')
    setInviteEmail('')
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

    loadData()
  }

  const handleCreateRole = async () => {
    if (!companyId || !newRoleName) return
    const { data, error } = await supabase
      .from('roles')
      .insert({ company_id: companyId, name: newRoleName, description: newRoleDescription })
      .select('id')
      .single()

    if (!error && data?.id && newRolePermissions.length) {
      await supabase.from('role_permissions').insert(
        newRolePermissions.map((permission) => ({ role_id: data.id, permission_code: permission })),
      )
    }

    setNewRoleName('')
    setNewRoleDescription('')
    setNewRolePermissions([])
    loadData()
  }

  const permissionOptions = useMemo(() => permissions, [permissions])

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to manage your team." />
  }

  if (isLoading) {
    return <div className="empty-state">Loading team settings...</div>
  }

  return (
    <div className="stack">
      <div className="grid grid-2">
        <div className="card">
          <h3 className="section-title">Team members</h3>
          {members.length === 0 ? (
            <EmptyState title="No members" description="Invite teammates to get started." />
          ) : (
            <table className="table">
              <thead>
                <tr>
                  <th>Name</th>
                  <th>Role</th>
                  <th>Joined</th>
                </tr>
              </thead>
              <tbody>
                {members.map((member) => (
                  <tr key={member.id}>
                    <td>
                      <div style={{ fontWeight: 600 }}>
                        {member.profiles?.full_name ?? member.profiles?.username ?? 'Unknown'}
                      </div>
                      <div className="small muted">{member.user_id}</div>
                    </td>
                    <td>
                      <select
                        className="select"
                        value={member.role_id ?? ''}
                        onChange={(event) => handleRoleChange(member.id, event.target.value)}
                      >
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="muted small">{new Date(member.joined_at).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        <div className="card stack">
          <h3 className="section-title">Invite members</h3>
          <label className="stack">
            Email
            <input
              className="input"
              type="email"
              value={inviteEmail}
              onChange={(event) => setInviteEmail(event.target.value)}
            />
          </label>
          <label className="stack">
            Role
            <select
              className="select"
              value={inviteRole ?? ''}
              onChange={(event) => setInviteRole(event.target.value)}
            >
              {roles.map((role) => (
                <option key={role.id} value={role.id}>
                  {role.name}
                </option>
              ))}
            </select>
          </label>
          <button className="button" type="button" onClick={handleInvite}>
            Send invite
          </button>
          {inviteMessage && <p className="muted">{inviteMessage}</p>}
        </div>
      </div>

      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Roles & permissions</h3>
          <span className="pill">{roles.length} roles</span>
        </div>
        {roles.length === 0 ? (
          <EmptyState title="No roles" description="Create a role to manage access." />
        ) : (
          <div className="stack">
            {roles.map((role) => (
              <div key={role.id} className="card" style={{ boxShadow: 'none' }}>
                <div className="stack">
                  <div className="row wrap">
                    <input
                      className="input"
                      value={role.name}
                      onChange={(event) => {
                        const updated = roles.map((item) =>
                          item.id === role.id ? { ...item, name: event.target.value } : item,
                        )
                        setRoles(updated)
                      }}
                    />
                    <input
                      className="input"
                      value={role.description ?? ''}
                      onChange={(event) => {
                        const updated = roles.map((item) =>
                          item.id === role.id ? { ...item, description: event.target.value } : item,
                        )
                        setRoles(updated)
                      }}
                      placeholder="Role description"
                    />
                  </div>
                  <div className="row wrap">
                    {permissionOptions.map((permission) => {
                      const selected = rolePermissions[role.id]?.includes(permission.code)
                      return (
                        <label key={permission.code} className="tag" style={{ borderColor: '#cbd5f5' }}>
                          <input
                            type="checkbox"
                            checked={selected}
                            onChange={(event) => {
                              setRolePermissions((prev) => {
                                const current = prev[role.id] ?? []
                                const next = event.target.checked
                                  ? [...current, permission.code]
                                  : current.filter((code) => code !== permission.code)
                                return { ...prev, [role.id]: next }
                              })
                            }}
                          />
                          {permission.description}
                        </label>
                      )
                    })}
                  </div>
                  <button className="button secondary" type="button" onClick={() => handleRoleSave(role)}>
                    Save role
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="card stack">
        <h3 className="section-title">Create a new role</h3>
        <div className="grid grid-2">
          <input
            className="input"
            placeholder="Role name"
            value={newRoleName}
            onChange={(event) => setNewRoleName(event.target.value)}
          />
          <input
            className="input"
            placeholder="Role description"
            value={newRoleDescription}
            onChange={(event) => setNewRoleDescription(event.target.value)}
          />
        </div>
        <div className="row wrap">
          {permissionOptions.map((permission) => (
            <label key={permission.code} className="tag" style={{ borderColor: '#cbd5f5' }}>
              <input
                type="checkbox"
                checked={newRolePermissions.includes(permission.code)}
                onChange={(event) => {
                  setNewRolePermissions((prev) =>
                    event.target.checked
                      ? [...prev, permission.code]
                      : prev.filter((code) => code !== permission.code),
                  )
                }}
              />
              {permission.description}
            </label>
          ))}
        </div>
        <button className="button" type="button" onClick={handleCreateRole}>
          Create role
        </button>
      </div>
    </div>
  )
}
