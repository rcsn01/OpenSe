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

// --- Sub-Components ---

const MembersTab = ({
  members,
  roles,
  inviteEmail,
  setInviteEmail,
  inviteRole,
  setInviteRole,
  handleInvite,
  handleRoleChange,
  inviteMessage,
}: {
  members: Member[]
  roles: Role[]
  inviteEmail: string
  setInviteEmail: (v: string) => void
  inviteRole: string | null
  setInviteRole: (v: string) => void
  handleInvite: () => void
  handleRoleChange: (memberId: string, roleId: string) => void
  inviteMessage: string | null
}) => {
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
      <div className="card stack" style={{ height: 'fit-content' }}>
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
  )
}

const RolesTab = ({
  roles,
  permissions,
  rolePermissions,
  setRolePermissions,
  setRoles,
  handleRoleSave,
  newRoleName,
  setNewRoleName,
  newRoleDescription,
  setNewRoleDescription,
  newRolePermissions,
  setNewRolePermissions,
  handleCreateRole,
}: {
  roles: Role[]
  permissions: Permission[]
  rolePermissions: Record<string, string[]>
  setRolePermissions: React.Dispatch<React.SetStateAction<Record<string, string[]>>>
  setRoles: (roles: Role[]) => void
  handleRoleSave: (role: Role) => void
  newRoleName: string
  setNewRoleName: (v: string) => void
  newRoleDescription: string
  setNewRoleDescription: (v: string) => void
  newRolePermissions: string[]
  setNewRolePermissions: React.Dispatch<React.SetStateAction<string[]>>
  handleCreateRole: () => void
}) => {
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
                        <label key={permission.code} className="tag" style={{ borderColor: '#cbd5f5', background: '#fff' }}>
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
                  <div>
                    <button className="button secondary small" type="button" onClick={() => handleRoleSave(role)}>
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
        <div>
          <button className="button" type="button" onClick={handleCreateRole}>
            Create Role
          </button>
        </div>
      </div>
    </div>
  )
}

const ActivityLogsTab = () => {
  // Mock data as per requirements since no backend table exists yet
  const [logs] = useState([
    {
      id: '1',
      actor: 'Alice Admin',
      action: 'Changed Permissions',
      target: 'Role: Manager',
      details: 'Added "billing.manage" permission',
      created_at: new Date(Date.now() - 1000 * 60 * 15).toISOString(), // 15 mins ago
    },
    {
      id: '2',
      actor: 'Bob User',
      action: 'Data Export',
      target: 'Inventory List',
      details: 'Exported 154 items to CSV',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString(), // 2 hours ago
    },
    {
      id: '3',
      actor: 'Alice Admin',
      action: 'User Login',
      target: 'Web App',
      details: 'Successful login from IP 192.168.1.1',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 4).toISOString(),
    },
    {
      id: '4',
      actor: 'System',
      action: 'Scheduled Report',
      target: 'Low Stock Report',
      details: 'Sent to team@example.com',
      created_at: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString(), // 1 day ago
    },
  ])

  return (
    <div className="card stack">
      <div className="flex-between">
        <h3 className="section-title">Audit Log</h3>
        <button className="button ghost small">Export Logs</button>
      </div>
      <p className="muted small">
        Track sensitive actions within your organization. 
        <br />
        <em>(Note: Historical data retention is 90 days)</em>
      </p>

      <table className="table">
        <thead>
          <tr>
            <th>Time</th>
            <th>Actor</th>
            <th>Action</th>
            <th>Target</th>
            <th>Details</th>
          </tr>
        </thead>
        <tbody>
          {logs.map((log) => (
            <tr key={log.id}>
              <td className="small muted">{formatDateTime(log.created_at)}</td>
              <td style={{ fontWeight: 500 }}>{log.actor}</td>
              <td>
                <span className={`badge ${log.action.includes('Export') ? 'warning' : 'neutral'}`}>
                  {log.action}
                </span>
              </td>
              <td>{log.target}</td>
              <td className="small muted">{log.details}</td>
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
  
  // Invite State
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string | null>(null)
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  
  // Role Creation State
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
    
    // Default invite role to first available
    if (!inviteRole && rolesList.length > 0) {
      setInviteRole(rolesList[0].id)
    }

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

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to manage your team." />
  }

  if (isLoading) {
    return <div className="empty-state">Loading team settings...</div>
  }

  return (
    <div className="stack">
      <div className="flex-between">
        <h1 className="page-title" style={{ fontSize: 24, margin: 0 }}>Team Settings</h1>
      </div>

      <Tabs
        tabs={[
          {
            id: 'members',
            label: 'Members',
            content: (
              <MembersTab
                members={members}
                roles={roles}
                inviteEmail={inviteEmail}
                setInviteEmail={setInviteEmail}
                inviteRole={inviteRole}
                setInviteRole={setInviteRole}
                handleInvite={handleInvite}
                handleRoleChange={handleRoleChange}
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
                permissions={permissions}
                rolePermissions={rolePermissions}
                setRolePermissions={setRolePermissions}
                setRoles={setRoles}
                handleRoleSave={handleRoleSave}
                newRoleName={newRoleName}
                setNewRoleName={setNewRoleName}
                newRoleDescription={newRoleDescription}
                setNewRoleDescription={setNewRoleDescription}
                newRolePermissions={newRolePermissions}
                setNewRolePermissions={setNewRolePermissions}
                handleCreateRole={handleCreateRole}
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