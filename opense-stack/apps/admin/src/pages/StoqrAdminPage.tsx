import { useEffect, useState } from 'react'
import { useAuth } from '@repo/shared/auth/context'
import { listCompanies, listCompanyMembers, removeMember, updateCompany, inviteMember } from '../api/stoqrAdmin'

type CompanySummary = {
  id: string
  name: string
  description: string | null
  subscription_tier: string | null
  created_at: string
  member_count: number
}

type CompanyMember = {
  id: string
  user_id: string
  joined_at: string
  role_name: string | null
  full_name: string | null
  email: string | null
}

export const StoqrAdminPage = () => {
  const { logout } = useAuth()
  const [companies, setCompanies] = useState<CompanySummary[]>([])
  const [selectedCompanyId, setSelectedCompanyId] = useState<string | null>(null)
  const [members, setMembers] = useState<CompanyMember[]>([])
  const [loading, setLoading] = useState(true)
  const [savingId, setSavingId] = useState<string | null>(null)
  const [inviteEmail, setInviteEmail] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  const selectedCompany = companies.find((company) => company.id === selectedCompanyId) ?? null

  const loadCompanies = async () => {
    setLoading(true)
    setMessage(null)
    try {
      const nextCompanies = await listCompanies()
      setCompanies(nextCompanies)
      setSelectedCompanyId((prev) => {
        if (prev && nextCompanies.some((company) => company.id === prev)) return prev
        return nextCompanies[0]?.id ?? null
      })
    } catch (error: any) {
      setMessage(error.message ?? 'Failed to load companies')
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (companyId: string) => {
    setMessage(null)
    try {
      const result = await listCompanyMembers(companyId)
      setMembers(result)
    } catch (error: any) {
      setMessage(error.message ?? 'Failed to load members')
      setMembers([])
    }
  }

  useEffect(() => {
    void loadCompanies()
  }, [])

  useEffect(() => {
    if (!selectedCompanyId) {
      setMembers([])
      return
    }
    void loadMembers(selectedCompanyId)
  }, [selectedCompanyId])

  const handleRename = async (companyId: string, name: string) => {
    const trimmed = name.trim()
    if (!trimmed) return
    setSavingId(companyId)
    setMessage(null)
    try {
      await updateCompany(companyId, { name: trimmed })
      await loadCompanies()
    } catch (error: any) {
      setMessage(error.message ?? 'Failed to update company name')
    } finally {
      setSavingId(null)
    }
  }

  const handleRemoveMember = async (memberId: string) => {
    if (!selectedCompanyId) return
    setSavingId(memberId)
    setMessage(null)
    try {
      await removeMember(memberId)
      await Promise.all([loadMembers(selectedCompanyId), loadCompanies()])
    } catch (error: any) {
      setMessage(error.message ?? 'Failed to remove member')
    } finally {
      setSavingId(null)
    }
  }

  const handleInvite = async (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    if (!selectedCompanyId) return

    setSavingId('invite')
    setMessage(null)
    try {
      await inviteMember(selectedCompanyId, inviteEmail)
      setInviteEmail('')
      setMessage('Invitation sent.')
    } catch (error: any) {
      setMessage(error.message ?? 'Failed to invite member')
    } finally {
      setSavingId(null)
    }
  }

  return (
    <main className="min-h-screen bg-slate-100 p-6">
      <div className="max-w-6xl mx-auto space-y-6">
        <header className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold text-slate-900">StoQR Admin</h1>
            <p className="text-sm text-slate-500">Manage StoQR companies and memberships.</p>
          </div>
          <button
            type="button"
            onClick={() => void logout()}
            className="rounded-md border border-slate-300 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
          >
            Sign Out
          </button>
        </header>

        {message && <p className="text-sm text-slate-700">{message}</p>}

        <section className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-900">Companies</h2>
            {loading ? (
              <p className="mt-3 text-sm text-slate-500">Loading companies...</p>
            ) : companies.length === 0 ? (
              <p className="mt-3 text-sm text-slate-500">No companies found.</p>
            ) : (
              <ul className="mt-3 divide-y divide-slate-200">
                {companies.map((company) => (
                  <li key={company.id} className="py-3">
                    <button
                      type="button"
                      onClick={() => setSelectedCompanyId(company.id)}
                      className={`w-full text-left rounded p-2 ${
                        selectedCompanyId === company.id ? 'bg-blue-50 border border-blue-200' : 'hover:bg-slate-50'
                      }`}
                    >
                      <p className="font-medium text-slate-900">{company.name}</p>
                      <p className="text-xs text-slate-500">
                        Tier: {company.subscription_tier ?? 'free'} • Members: {company.member_count}
                      </p>
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </div>

          <div className="bg-white rounded-lg border border-slate-200 p-4">
            <h2 className="text-base font-semibold text-slate-900">Selected Company</h2>
            {!selectedCompany ? (
              <p className="mt-3 text-sm text-slate-500">Select a company to manage.</p>
            ) : (
              <div className="mt-3 space-y-4">
                <form
                  onSubmit={(event) => {
                    event.preventDefault()
                    const formData = new FormData(event.currentTarget)
                    const nextName = String(formData.get('company-name') ?? '')
                    void handleRename(selectedCompany.id, nextName)
                  }}
                  className="space-y-2"
                >
                  <label htmlFor="company-name" className="block text-sm font-medium text-slate-700">
                    Company name
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="company-name"
                      name="company-name"
                      defaultValue={selectedCompany.name}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                    />
                    <button
                      type="submit"
                      disabled={savingId === selectedCompany.id}
                      className="rounded-md bg-blue-600 px-3 py-2 text-sm text-white hover:bg-blue-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </form>

                <form onSubmit={handleInvite} className="space-y-2">
                  <label htmlFor="invite-email" className="block text-sm font-medium text-slate-700">
                    Invite by email
                  </label>
                  <div className="flex gap-2">
                    <input
                      id="invite-email"
                      name="invite-email"
                      type="email"
                      value={inviteEmail}
                      onChange={(event) => setInviteEmail(event.target.value)}
                      className="flex-1 rounded-md border border-slate-300 px-3 py-2 text-sm"
                      placeholder="member@company.com"
                      required
                    />
                    <button
                      type="submit"
                      disabled={savingId === 'invite'}
                      className="rounded-md border border-slate-300 px-3 py-2 text-sm hover:bg-slate-50 disabled:opacity-50"
                    >
                      Invite
                    </button>
                  </div>
                </form>

                <div>
                  <h3 className="text-sm font-medium text-slate-700">Members</h3>
                  {members.length === 0 ? (
                    <p className="mt-2 text-sm text-slate-500">No members found.</p>
                  ) : (
                    <ul className="mt-2 divide-y divide-slate-200">
                      {members.map((member) => (
                        <li key={member.id} className="py-2 flex items-center justify-between gap-3">
                          <div>
                            <p className="text-sm text-slate-900">{member.full_name || member.email || member.user_id}</p>
                            <p className="text-xs text-slate-500">{member.email ?? 'No email'} • {member.role_name ?? 'No role'}</p>
                          </div>
                          <button
                            type="button"
                            disabled={savingId === member.id}
                            onClick={() => void handleRemoveMember(member.id)}
                            className="rounded-md border border-red-200 px-2 py-1 text-xs text-red-700 hover:bg-red-50 disabled:opacity-50"
                          >
                            Remove
                          </button>
                        </li>
                      ))}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
