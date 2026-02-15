import { useEffect, useState } from 'react'
import { useAuth } from '@repo/shared/auth/context'
import {
  BasePage,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { listCompanies, listCompanyMembers } from '../api/stoqrAdmin'
import { getErrorMessage } from '../lib/errors'

type CompanySummary = {
  id: string
  name: string
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
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Failed to load companies'))
    } finally {
      setLoading(false)
    }
  }

  const loadMembers = async (companyId: string) => {
    setMessage(null)
    try {
      const result = await listCompanyMembers(companyId)
      setMembers(result)
    } catch (error: unknown) {
      setMessage(getErrorMessage(error, 'Failed to load members'))
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

  return (
    <BasePage isLoading={loading} loadingMessage="Loading StoQR admin...">
      <div className="flex flex-col gap-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-semibold">StoQR Admin</h1>
            <p className="text-sm text-[var(--color-muted-foreground)]">Read-only StoQR organisation oversight.</p>
          </div>
          <Button variant="outline" onClick={() => void logout()}>Sign Out</Button>
        </div>

        {message && <p className="text-sm text-[var(--color-muted-foreground)]">{message}</p>}

        <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
          <Card>
            <CardHeader>
              <CardTitle>Companies</CardTitle>
              <CardDescription>Select a company to manage details and members.</CardDescription>
            </CardHeader>
            <CardContent>
              {companies.length === 0 ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">No companies found.</p>
              ) : (
                <div className="flex flex-col gap-2">
                  {companies.map((company) => (
                    <button
                      key={company.id}
                      type="button"
                      onClick={() => setSelectedCompanyId(company.id)}
                      className={`w-full rounded-md border px-3 py-2 text-left ${
                        selectedCompanyId === company.id
                          ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/10'
                          : 'border-[var(--color-border)] hover:bg-[var(--color-muted)]/60'
                      }`}
                    >
                      <p className="font-medium">{company.name}</p>
                      <p className="text-xs text-[var(--color-muted-foreground)]">
                        Members: {company.member_count}
                      </p>
                    </button>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Selected Company</CardTitle>
              <CardDescription>{selectedCompany?.name ?? 'Select a company to begin'}</CardDescription>
            </CardHeader>
            <CardContent>
              {!selectedCompany ? (
                <p className="text-sm text-[var(--color-muted-foreground)]">Select a company to manage.</p>
              ) : (
                <div className="flex flex-col gap-4">
                  <p className="text-sm text-[var(--color-muted-foreground)]">
                    Membership and seat assignment actions have moved to the Accounts app.
                  </p>

                  {members.length === 0 ? (
                    <p className="text-sm text-[var(--color-muted-foreground)]">No members found.</p>
                  ) : (
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Name</TableHead>
                          <TableHead>Email</TableHead>
                          <TableHead>Role</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {members.map((member) => (
                          <TableRow key={member.id}>
                            <TableCell>{member.full_name || member.user_id}</TableCell>
                            <TableCell>{member.email ?? 'No email'}</TableCell>
                            <TableCell>{member.role_name ?? 'No role'}</TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </BasePage>
  )
}
