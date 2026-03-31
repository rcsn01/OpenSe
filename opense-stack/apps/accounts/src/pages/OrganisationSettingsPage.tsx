import { useEffect, useState } from 'react'
import { Alert, Card, CardContent, CardDescription, CardHeader, CardTitle, Spinner } from '@repo/ui'
import { getOrganisationBillingSummary } from '../api/organisationBilling'

export const OrganisationSettingsPage = () => {
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [orgName, setOrgName] = useState<string>('')
  const [role, setRole] = useState<string>('member')

  useEffect(() => {
    const loadOrganisation = async () => {
      try {
        setLoading(true)
        setError(null)
        const summary = await getOrganisationBillingSummary()
        setOrgName(summary.organisation.orgName)
        setRole(summary.organisation.role)
      } catch (err: any) {
        setError(err?.message ?? 'Failed to load organisation settings.')
      } finally {
        setLoading(false)
      }
    }

    void loadOrganisation()
  }, [])

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-[var(--color-heading)]">Organisation</h1>
        <p className="text-sm text-[var(--color-muted-foreground)]">Manage your organisation profile and account ownership context.</p>
      </div>

      {error ? <Alert variant="destructive" title="Unable to load organisation">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Organisation profile</CardTitle>
          <CardDescription>Billing and seat controls are available in the Billing & Limits section.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-[var(--color-muted-foreground)]">
              <Spinner size="sm" />
              Loading organisation details...
            </div>
          ) : (
            <dl className="grid gap-4 sm:grid-cols-2">
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Organisation Name</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--color-heading)]">{orgName || '—'}</dd>
              </div>
              <div>
                <dt className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">Your Role</dt>
                <dd className="mt-1 text-sm font-medium text-[var(--color-heading)]">{role}</dd>
              </div>
            </dl>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
