import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BasePage, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { Building2, Boxes, ShieldCheck, Users } from 'lucide-react'
import { listAdminOrgs, listAdminUsers } from '../api/etlAdmin'
import { listCompanies } from '../api/stoqrAdmin'
import { getErrorMessage } from '../lib/errors'

type OverviewState = {
  etlOrgCount: number
  etlUserCount: number
  etlSuperAdminCount: number
  stoqrCompanyCount: number
  stoqrMemberCount: number
}

const emptyState: OverviewState = {
  etlOrgCount: 0,
  etlUserCount: 0,
  etlSuperAdminCount: 0,
  stoqrCompanyCount: 0,
  stoqrMemberCount: 0,
}

export const PlatformOverviewPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewState>(emptyState)

  const metricCards = useMemo(
    () => [
      { key: 'etlOrgCount', label: 'ETL Organisations', value: overview.etlOrgCount, icon: Building2 },
      { key: 'etlUserCount', label: 'ETL Users', value: overview.etlUserCount, icon: Users },
      { key: 'etlSuperAdminCount', label: 'Super Admins', value: overview.etlSuperAdminCount, icon: ShieldCheck },
      { key: 'stoqrCompanyCount', label: 'StoQR Companies', value: overview.stoqrCompanyCount, icon: Boxes },
    ],
    [overview],
  )

  const loadOverview = async () => {
    setLoading(true)
    setError(null)

    try {
      const [orgs, users, companies] = await Promise.all([listAdminOrgs(), listAdminUsers(), listCompanies()])
      setOverview({
        etlOrgCount: orgs.length,
        etlUserCount: users.length,
        etlSuperAdminCount: users.filter((user) => (user.super_admin_members?.length ?? 0) > 0).length,
        stoqrCompanyCount: companies.length,
        stoqrMemberCount: companies.reduce((sum, company) => sum + company.member_count, 0),
      })
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load platform overview'))
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  return (
    <BasePage isLoading={loading} loadingMessage="Loading platform overview...">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Platform Overview</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Centralized controls for both ETL and StoQR administration.
          </p>
        </div>

        {error && (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            </CardContent>
          </Card>
        )}

        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {metricCards.map(({ key, label, value, icon: Icon }) => (
            <Card key={key}>
              <CardContent className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-wide text-[var(--color-muted-foreground)]">{label}</p>
                  <p className="text-2xl font-semibold mt-1">{value}</p>
                </div>
                <Icon className="h-5 w-5 text-[var(--color-primary)]" />
              </CardContent>
            </Card>
          ))}
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Management Areas</CardTitle>
            <CardDescription>Open each admin area to manage app-specific resources.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/etl-admin')}>Manage ETL</Button>
            <Button variant="secondary" onClick={() => navigate('/stoqr')}>Manage StoQR</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>StoQR Footprint</CardTitle>
            <CardDescription>Current member allocations across all StoQR companies.</CardDescription>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-[var(--color-muted-foreground)]">
              Total StoQR company memberships: <span className="font-semibold text-[var(--color-foreground)]">{overview.stoqrMemberCount}</span>
            </p>
          </CardContent>
        </Card>
      </div>
    </BasePage>
  )
}
