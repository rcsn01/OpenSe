import { useEffect, useState } from 'react'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'

export const CompanySetup = () => {
  const { refreshCompanies } = useCompany()
  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [inviteToken, setInviteToken] = useState('')
  const [inviteMessage, setInviteMessage] = useState<string | null>(null)
  const [userEmail, setUserEmail] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [pendingInvites, setPendingInvites] = useState<
    { id: string; company_id: string; role_id: string; email: string; token: string; companies?: { id: string; name: string } }[]
  >([])

  useEffect(() => {
    const loadUser = async () => {
      const { data } = await supabase.auth.getUser()
      setUserEmail(data.user?.email ?? null)
      setUserId(data.user?.id ?? null)
    }

    loadUser()
  }, [])

  const loadInvites = async () => {
    if (!userEmail) return
    const { data, error } = await supabase
      .from('company_invitations')
      .select('id, company_id, role_id, email, token, companies (id, name)')
      .eq('email', userEmail)
      .is('accepted_at', null)

    if (error) {
      console.error(error)
      setPendingInvites([])
      return
    }

    setPendingInvites((data as any[]) ?? [])
  }

  useEffect(() => {
    loadInvites()
  }, [userEmail])

  useEffect(() => {
    const storedToken = localStorage.getItem('fts_invite_token')
    if (storedToken) {
      setInviteToken(storedToken)
    }
  }, [])

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault()
    setIsLoading(true)
    setMessage(null)

    const { error } = await supabase.from('companies').insert({ name, description })
    if (error) {
      setMessage(error.message)
    } else {
      setName('')
      setDescription('')
      await refreshCompanies()
    }

    setIsLoading(false)
  }

  const acceptInvite = async (token: string) => {
    if (!token || !userId) return
    setInviteMessage(null)
    const { data: invite, error: inviteError } = await supabase
      .from('company_invitations')
      .select('id, company_id, role_id, email')
      .eq('token', token)
      .is('accepted_at', null)
      .single()

    if (inviteError || !invite) {
      setInviteMessage(inviteError?.message ?? 'Invite not found or already accepted.')
      return
    }

    const { error: memberError } = await supabase.from('company_members').insert({
      company_id: invite.company_id,
      role_id: invite.role_id,
      user_id: userId,
    })

    if (memberError) {
      setInviteMessage(memberError.message)
      return
    }

    await supabase
      .from('company_invitations')
      .update({ accepted_at: new Date().toISOString() })
      .eq('id', invite.id)

    localStorage.removeItem('fts_invite_token')
    setInviteToken('')
    setInviteMessage('Invite accepted. Welcome to the team!')
    await refreshCompanies()
    loadInvites()
  }

  return (
    <div className="grid grid-2" style={{ maxWidth: 1040 }}>
      <div className="card stack">
        <h2 style={{ marginTop: 0 }}>Join an organization</h2>
        <p className="muted">
          Accept an invitation to access an existing workspace.
        </p>
        {pendingInvites.length > 0 && (
          <div className="stack">
            {pendingInvites.map((invite) => (
              <div key={invite.id} className="card" style={{ boxShadow: 'none' }}>
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 600 }}>{invite.companies?.name ?? invite.company_id}</div>
                    <div className="small muted">Invited as {invite.email}</div>
                  </div>
                  <button className="button secondary" type="button" onClick={() => acceptInvite(invite.token)}>
                    Accept
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
        <label className="stack">
          Invite token
          <input
            className="input"
            value={inviteToken}
            onChange={(event) => setInviteToken(event.target.value)}
            placeholder="Paste invite token"
          />
        </label>
        <button className="button" type="button" onClick={() => acceptInvite(inviteToken)}>
          Join with token
        </button>
        {inviteMessage && <p className="muted">{inviteMessage}</p>}
      </div>
      <div className="card stack">
        <h2 style={{ marginTop: 0 }}>Create a new organization</h2>
        <p className="muted">
          Start your own workspace and invite teammates once you are inside.
        </p>
        <form className="stack" onSubmit={handleSubmit}>
          <label className="stack">
            Company name
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} required />
          </label>
          <label className="stack">
            Description
            <textarea
              className="textarea"
              rows={3}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
            />
          </label>
          <button className="button" type="submit" disabled={isLoading}>
            {isLoading ? 'Creating...' : 'Create company'}
          </button>
          {message && <p className="muted">{message}</p>}
        </form>
      </div>
    </div>
  )
}
