import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import { formatDateTime } from '../utils'

// --- Types ---

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

// --- Tab Components ---

const MembersTab = ({
  members,
  roles,
  onRoleChange,
  onInvite,
  inviteMessage
}: {
  members: Member[]
  roles: Role[]
  onRoleChange: (memberId: string, roleId: string) => void
  onInvite: (email: string, roleId: string) => void
  inviteMessage: string | null
}) => {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>(roles[0]?.id ?? '')

  // Reset default role when roles load
  useEffect(() => {
    if (roles.length > 0 && !inviteRole) {
      setInviteRole(roles[0].id)
    }
  }, [roles, inviteRole])

  const handleInviteSubmit = () => {
    onInvite(inviteEmail, inviteRole)
    setInviteEmail('')
  }

  return (
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
                      onChange={(event) => onRoleChange(member.id, event.target.value)}
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
      <div className="card stack" style={{ height: 'fit-content' }}>
        <h3 className="section-title">Invite members</h3>
        <label className="stack">
          Email
          <input
            className="input"
            type="email"
            value={inviteEmail}
            onChange={(event) => setInviteEmail(event.target.value)}
            placeholder="colleague@example.com"
          />
        </label>
        <label className="stack">
          Role
          <select
            className="select"
            value={inviteRole}
            onChange={(event) => setInviteRole(event.target.value)}
          >
            {roles.map((role) => (
              <option key={role.id} value={role.id}>
                {role.name}
              </option>
            ))}
          </select>
        </label>
        <button className="button" type="button" onClick={handleInviteSubmit} disabled={!inviteEmail}>
          Send invite
        </button>
        {inviteMessage && <p className="muted">{inviteMessage}</p>}
      </div>
    </div>
  )
}

const RolesTab = ({
  roles,
  setRoles,
  permissions,
  rolePermissions,
  setRolePermissions,
  onSaveRole,
  onCreateRole
}: {
  roles: Role[]
  setRoles: (roles: Role[]) => void
  permissions: Permission[]
  rolePermissions: Record<string, string[]>
  setRolePermissions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  onSaveRole: (role: Role) => void
  onCreateRole: (name: string, desc: string, perms: string[]) => void
}) => {
  const [newRoleName, setNewRoleName] = useState('')
  const [newRoleDescription, setNewRoleDescription] = useState('')
  const [newRolePermissions, setNewRolePermissions] = useState<string[]>([])

  const handleCreateSubmit = () => {
    onCreateRole(newRoleName, newRoleDescription, newRolePermissions)
    setNewRoleName('')
    setNewRoleDescription('')
    setNewRolePermissions([])
  }

  return (
    <div className="stack">
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
              <div key={role.id} className="card" style={{ boxShadow: 'none', background: '#f8fafc' }}>
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
                      style={{ fontWeight: 600 }}
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
                      style={{ flex: 1 }}
                    />
                  </div>
                  <div className="row wrap">
                    {permissions.map((permission) => {
                      const selected = rolePermissions[role.id]?.includes(permission.code)
                      return (
                        <label key={permission.code} className="tag" style={{ 
                          borderColor: selected ? 'var(--primary)' : '#e2e8f0',
                          background: selected ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                          cursor: 'pointer'
                        }}>
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
                            style={{ marginRight: 6 }}
                          />
                          {permission.description}
                        </label>
                      )
                    })}
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                    <button className="button secondary small" type="button" onClick={() => onSaveRole(role)}>
                      Save Changes
                    </button>
                  </div>
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
          {permissions.map((permission) => (
            <label key={permission.code} className="tag" style={{ 
              borderColor: newRolePermissions.includes(permission.code) ? 'var(--primary)' : '#e2e8f0',
              cursor: 'pointer'
            }}>
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
                style={{ marginRight: 6 }}
              />
              {permission.description}
            </label>
          ))}
        </div>
        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
          <button className="button" type="button" onClick={handleCreateSubmit} disabled={!newRoleName}>
            Create Role
          </button>
        </div>
      </div>
    </div>
  )
}

const ActivityLogsTab = () => {
  // Mock data since no backend table exists for system logs yet
  const [logs] = useState([
    { id: '1', user: 'Admin User', action: 'Changed Permissions', details: 'Updated "Manager" role permissions', date: new Date().toISOString() },
    { id: '2', user: 'Admin User', action: 'Data Export', details: 'Exported Inventory Valuation Report', date: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: '3', user: 'Jane Doe', action: 'Login', details: 'Successful login from 192.168.1.42', date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: '4', user: 'Admin User', action: 'Invited Member', details: 'Invited new.user@example.com as Viewer', date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: '5', user: 'System', action: 'Backup', details: 'Automated daily backup completed', date: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  ])

  return (
    <div className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-between">
          <h3 className="section-title" style={{ margin: 0 }}>Activity Logs</h3>
          <button className="button ghost small">Export Logs</button>
        </div>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          Global feed of system access, permission changes, and administrative actions.
        </p>
      </div>
      <table className="table">
        <thead>
          <tr>
            <th>Timestamp</th>
            <th>User</th>
            <th>Action</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                {formatDateTime(log.date)}
              </td>
              <td style={{ fontWeight: 500 }}>{log.user}</td>
              <td>
                <span className={`pill ${log.action === 'Login' ? 'success' : 'neutral'}`}>
                  {log.action}
                </span>
              </td>
              <td className="small">{log.details}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

// --- Main Page Component ---

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

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to manage your team." />
  }

  if (isLoading) {
    return <div className="empty-state">Loading team settings...</div>
  }

  return (
    <div className="stack">
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
    </div>
  )
}