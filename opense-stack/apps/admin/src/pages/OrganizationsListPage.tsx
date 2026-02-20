import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  BasePage,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
  Select,
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@repo/ui'
import { listAdminOrgs, type OrgRow } from '../api/etlAdmin'
import { listOrgSeatSummary, listPricingPlans } from '../api/adminPlatform'
import { getErrorMessage } from '../lib/errors'

type OrganizationListRow = {
  id: string
  name: string
  status: 'active' | 'suspended'
  app1Seats: number
  app2Seats: number
  mrr: number
}

const statusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspended' },
]

export const OrganizationsListPage = () => {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'suspended'>('all')
  const [rows, setRows] = useState<OrganizationListRow[]>([])

  useEffect(() => {
    const load = async () => {
      setLoading(true)
      setError(null)

      try {
        const [orgs, pricingPlans] = await Promise.all([listAdminOrgs(), listPricingPlans()])

        const monthlySeatPricingCents = pricingPlans
          .filter((plan) => plan.is_active && plan.billing_interval === 'monthly' && !plan.is_bundle && plan.app_code)
          .reduce<Record<string, number>>((acc, plan) => {
            const appCode = plan.app_code ?? ''
            acc[appCode] = plan.seat_price_cents
            return acc
          }, {})

        const nextRows = await Promise.all(
          orgs.map(async (org: OrgRow) => {
            const seatSummary = await listOrgSeatSummary(org.id)
            const etl = seatSummary.find((row) => row.app_code === 'etl')
            const stoqr = seatSummary.find((row) => row.app_code === 'stoqr')

            const app1Seats = etl?.seat_limit ?? 0
            const app2Seats = stoqr?.seat_limit ?? 0
            const mrrCents = app1Seats * (monthlySeatPricingCents.etl ?? 0) + app2Seats * (monthlySeatPricingCents.stoqr ?? 0)

            return {
              id: org.id,
              name: org.name,
              status: org.status,
              app1Seats,
              app2Seats,
              mrr: mrrCents / 100,
            }
          }),
        )

        setRows(nextRows)
      } catch (loadError: unknown) {
        setError(getErrorMessage(loadError, 'Failed to load organizations list'))
      } finally {
        setLoading(false)
      }
    }

    void load()
  }, [])

  const filteredRows = useMemo(
    () =>
      rows.filter((row) => {
        const matchesQuery = row.name.toLowerCase().includes(query.toLowerCase())
        const matchesStatus = statusFilter === 'all' || row.status === statusFilter
        return matchesQuery && matchesStatus
      }),
    [rows, query, statusFilter],
  )

  return (
    <BasePage isLoading={loading} loadingMessage="Loading organizations...">
      <div className="flex flex-col gap-6">
        <div>
          <h1 className="text-2xl font-semibold">Organizations List</h1>
          <p className="text-sm text-[var(--color-muted-foreground)]">
            Search and filter organizations across ETL and StoQR, then open a specific organization profile.
          </p>
        </div>

        {error ? (
          <Card className="border-[var(--color-destructive)]/30">
            <CardContent>
              <p className="text-sm text-[var(--color-destructive)]">{error}</p>
            </CardContent>
          </Card>
        ) : null}

        <Card>
          <CardHeader>
            <CardTitle>Organizations</CardTitle>
            <CardDescription>Org Name, Status, App 1 Seats, App 2 Seats, and MRR.</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="mb-3 grid gap-3 md:grid-cols-[1fr_220px]">
              <Input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search organization" />
              <Select value={statusFilter} options={statusOptions} onChange={(event) => setStatusFilter(event.target.value as 'all' | 'active' | 'suspended')} />
            </div>

            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Org Name</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total App 1 Seats</TableHead>
                  <TableHead>Total App 2 Seats</TableHead>
                  <TableHead>MRR</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredRows.map((row) => (
                  <TableRow key={row.id}>
                    <TableCell className="font-medium">
                      <button
                        type="button"
                        className="text-left hover:underline"
                        onClick={() => navigate(`/organisations/${row.id}`)}
                      >
                        {row.name}
                      </button>
                    </TableCell>
                    <TableCell>{row.status === 'active' ? 'Active' : 'Suspended'}</TableCell>
                    <TableCell>{row.app1Seats}</TableCell>
                    <TableCell>{row.app2Seats}</TableCell>
                    <TableCell>${row.mrr.toLocaleString()}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>

            {filteredRows.length === 0 ? <p className="mt-3 text-sm text-[var(--color-muted-foreground)]">No organizations found.</p> : null}
          </CardContent>
        </Card>
      </div>
    </BasePage>
  )
}
