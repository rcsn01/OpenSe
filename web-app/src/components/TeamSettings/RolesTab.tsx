import { useState } from 'react'
import { EmptyState } from '../EmptyState'

type Role = {
  id: string
  name: string
  description: string | null
}

type Permission = {
  code: string
  description: string
}

export const RolesTab = ({
  roles,
  setRoles,
  permissions,
  rolePermissions,
  setRolePermissions,
  onSaveRole,
  onCreateRole,
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
                        <label
                          key={permission.code}
                          className="tag"
                          style={{
                            borderColor: selected ? 'var(--primary)' : '#e2e8f0',
                            background: selected ? 'rgba(37, 99, 235, 0.05)' : 'transparent',
                            cursor: 'pointer',
                          }}
                        >
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
            <label
              key={permission.code}
              className="tag"
              style={{
                borderColor: newRolePermissions.includes(permission.code) ? 'var(--primary)' : '#e2e8f0',
                cursor: 'pointer',
              }}
            >
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
