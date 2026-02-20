import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { BasePage, Button, Card, CardContent, CardDescription, CardHeader, CardTitle } from '@repo/ui'
import { Activity, Building2, Boxes, ShieldCheck, Users } from 'lucide-react'
import { listAdminAuditEvents, listAdminOrgs, listAdminUsers } from '../api/etlAdmin'
import { listCompanies } from '../api/stoqrAdmin'
import { getErrorMessage } from '../lib/errors'
import { listRevenueReportSummary, listSystemHealth } from '../api/adminPlatform'
import { formatAppCode } from '../lib/appCodes'

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

type OverviewState = {
  etlOrgCount: number
  etlUserCount: number
  etlSuperAdminCount: number
  stoqrCompanyCount: number
  stoqrMemberCount: number
  totalSeatUtilized: number
  mrr: number
  recentSignups: number
}

const emptyState: OverviewState = {
  etlOrgCount: 0,
  etlUserCount: 0,
  etlSuperAdminCount: 0,
  stoqrCompanyCount: 0,
  stoqrMemberCount: 0,
  totalSeatUtilized: 0,
  mrr: 0,
  recentSignups: 0,
}

type HealthState = {
  app: 'ETL' | 'StoQR'
  uptime: string
  errorSpike: string
  alerts: string
}

export const PlatformOverviewPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [overview, setOverview] = useState<OverviewState>(emptyState)
  const [activity, setActivity] = useState<Array<{ id: string; message: string; created_at: string }>>([])
  const [systemHealth, setSystemHealth] = useState<HealthState[]>([])
  const [systemHealthError, setSystemHealthError] = useState<string | null>(null)

  const metricCards = useMemo(
    () => [
      { key: 'orgCount', label: 'Active Organisations', value: overview.etlOrgCount + overview.stoqrCompanyCount, icon: Building2 },
      { key: 'seatUtilized', label: 'Seats Utilized (ETL + StoQR)', value: overview.totalSeatUtilized, icon: Users },
      { key: 'mrr', label: 'MRR', value: `$${overview.mrr.toLocaleString()}`, icon: ShieldCheck },
      { key: 'recentSignups', label: 'Recent Sign-ups (30d)', value: overview.recentSignups, icon: Boxes },
    ],
    [overview],
  )

  const loadOverview = async () => {
    setLoading(true)
    setError(null)
    setSystemHealthError(null)

    try {
      const [orgs, users, companies, revenueRows] = await Promise.all([
        listAdminOrgs(),
        listAdminUsers(),
        listCompanies(),
        listRevenueReportSummary(),
      ])
      const last30Days = Date.now() - THIRTY_DAYS_MS
      const recentSignups = users.filter((user) => {
        if (!user.created_at) return false
        return new Date(user.created_at).getTime() >= last30Days
      }).length

      const totalSeatUtilized = (orgs.reduce((sum, org) => sum + (org.member_count ?? 0), 0) + companies.reduce((sum, company) => sum + company.member_count, 0))
      const mrr = revenueRows.reduce((sum, row) => sum + row.estimated_mrr_cents, 0) / 100

      setOverview({
        etlOrgCount: orgs.length,
        etlUserCount: users.length,
        etlSuperAdminCount: users.filter((user) => (user.super_admin_members?.length ?? 0) > 0).length,
        stoqrCompanyCount: companies.length,
        stoqrMemberCount: companies.reduce((sum, company) => sum + company.member_count, 0),
        totalSeatUtilized,
        mrr,
        recentSignups,
      })

      const auditEvents = await listAdminAuditEvents(null, 8)
      setActivity(
        auditEvents.map((event) => ({
          id: event.id,
          message: `${event.org_name}: ${event.action}`,
          created_at: event.created_at,
        })),
      )
    } catch (loadError: unknown) {
      setError(getErrorMessage(loadError, 'Failed to load platform overview'))
    } finally {
      setLoading(false)
    }

    try {
      const healthRows = await listSystemHealth()
      setSystemHealth(
        healthRows.map((row) => ({
          app: formatAppCode(row.app_code),
          uptime: `${Number(row.uptime_percent).toFixed(2)}%`,
          errorSpike: row.error_spike_level[0]?.toUpperCase() + row.error_spike_level.slice(1),
          alerts: `${row.active_alert_count} active alerts`,
        })),
      )
    } catch (healthError: unknown) {
      setSystemHealth([])
      setSystemHealthError(getErrorMessage(healthError, 'Failed to load system health telemetry'))
    }
  }

  useEffect(() => {
    void loadOverview()
  }, [])

  return (
    <BasePage isLoading={loading} loadingMessage="Loading platform overview...">
      <div className="flex flex-col gap-6">
        <div className="flex flex-col gap-2">
          <h1 className="text-2xl font-semibold text-[var(--color-foreground)]">Global Overview</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Birds-eye suite health and business posture for ETL and StoQR.
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
            <CardTitle>System Health</CardTitle>
            <CardDescription>Current uptime, error spikes, and active alert posture by app.</CardDescription>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
              {systemHealthError ? <p className="text-sm text-[var(--color-destructive)]">{systemHealthError}</p> : null}
            {systemHealth.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No telemetry snapshots available yet.</p>
            ) : (
              systemHealth.map((entry) => (
                <div key={entry.app} className="rounded-md border border-[var(--color-border)] p-3">
                  <p className="text-sm font-medium">{entry.app}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">Uptime: {entry.uptime}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Error Spike: {entry.errorSpike}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)]">Alerts: {entry.alerts}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Management Areas</CardTitle>
            <CardDescription>Open each suite section for focused global administration.</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-3">
            <Button onClick={() => navigate('/organisations')}>Organizations List</Button>
            <Button variant="outline" onClick={() => navigate('/applications')}>Application Management</Button>
            <Button variant="outline" onClick={() => navigate('/financials')}>Financials & Billing</Button>
            <Button variant="outline" onClick={() => navigate('/platform-admin')}>Platform Administration</Button>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Activity Feed</CardTitle>
            <CardDescription>Recent high-level actions across the suite.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2">
            {activity.length === 0 ? (
              <p className="text-sm text-[var(--color-muted-foreground)]">No recent activity.</p>
            ) : (
              activity.map((event) => (
                <div key={event.id} className="rounded-md border border-[var(--color-border)] p-3">
                  <p className="text-sm font-medium flex items-center gap-2"><Activity className="h-4 w-4" />{event.message}</p>
                  <p className="text-xs text-[var(--color-muted-foreground)] mt-1">{new Date(event.created_at).toLocaleString()}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>
    </BasePage>
  )
}
