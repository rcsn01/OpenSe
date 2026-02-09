import { useEffect, useState } from 'react'
import { EmptyState } from '../EmptyState'

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

export const MembersTab = ({
  members,
  roles,
  onRoleChange,
  onInvite,
  inviteMessage,
}: {
  members: Member[]
  roles: Role[]
  onRoleChange: (memberId: string, roleId: string) => void
  onInvite: (email: string, roleId: string) => void
  inviteMessage: string | null
}) => {
  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<string>(roles[0]?.id ?? '')

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
          <div className="table-wrap">
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
          </div>
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
