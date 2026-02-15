import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Alert, Badge, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input, Spinner } from '@repo/ui'
import {
  createCheckoutForSeatLimit,
  getOrganisationBillingSummary,
  type AppCode,
  type AppSeatBillingSummary,
  updateSeatLimit,
} from '../api/organisationBilling'
import { listOrgAuditEvents, type OrgAuditEvent } from '../api/auditEvents'

const actionLabelMap: Record<string, string> = {
  seat_limit_updated: 'Seat limit updated',
  seat_assigned: 'Seat assigned',
  seat_unassigned: 'Seat unassigned',
}

export const BillingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [activityLoading, setActivityLoading] = useState(true)
  const [savingApp, setSavingApp] = useState<AppCode | null>(null)
  const [checkoutApp, setCheckoutApp] = useState<AppCode | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [orgName, setOrgName] = useState('')
  const [apps, setApps] = useState<AppSeatBillingSummary[]>([])
  const [auditEvents, setAuditEvents] = useState<OrgAuditEvent[]>([])
  const [seatLimitDrafts, setSeatLimitDrafts] = useState<Record<AppCode, string>>({ etl: '0', stoqr: '0' })

  const hasSubscription = useMemo(() => apps.some((app) => app.seatLimit > 0), [apps])

  const loadSummary = async () => {
    try {
      setLoading(true)
      setActivityLoading(true)
      setError(null)
      const [summary, events] = await Promise.all([getOrganisationBillingSummary(), listOrgAuditEvents(12)])
      setOrgName(summary.organisation.orgName)
      setApps(summary.apps)
      setAuditEvents(events)
      setSeatLimitDrafts({
        etl: String(summary.apps.find((app) => app.appCode === 'etl')?.seatLimit ?? 0),
        stoqr: String(summary.apps.find((app) => app.appCode === 'stoqr')?.seatLimit ?? 0),
      })
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load billing information.')
    } finally {
      setLoading(false)
      setActivityLoading(false)
    }
  }

  useEffect(() => {
    void loadSummary()
  }, [])

  useEffect(() => {
    if (searchParams.get('success') === 'true') {
      setSuccess('Checkout completed. Subscription sync is being applied.')
    }

    if (searchParams.get('canceled') === 'true') {
      setError('Checkout was canceled.')
    }

    if (searchParams.get('success') === 'true' || searchParams.get('canceled') === 'true') {
      const next = new URLSearchParams(searchParams)
      next.delete('success')
      next.delete('canceled')
      setSearchParams(next, { replace: true })
    }
  }, [searchParams, setSearchParams])

  const handleSaveLimit = async (appCode: AppCode) => {
    const rawValue = seatLimitDrafts[appCode]?.trim() ?? ''
    const parsed = Number(rawValue)

    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Seat limit must be a non-negative integer.')
      return
    }

    try {
      setSavingApp(appCode)
      setError(null)
      setSuccess(null)
      await updateSeatLimit(appCode, parsed)
      setSuccess(`${appCode.toUpperCase()} seat limit updated.`)
      await loadSummary()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update seat limit.')
    } finally {
      setSavingApp(null)
    }
  }

  const handleStartCheckout = async (appCode: AppCode) => {
    const rawValue = seatLimitDrafts[appCode]?.trim() ?? ''
    const parsed = Number(rawValue)

    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Seat limit must be a non-negative integer.')
      return
    }

    try {
      setCheckoutApp(appCode)
      setError(null)
      const url = await createCheckoutForSeatLimit(appCode, parsed)
      window.location.href = url
    } catch (err: any) {
      setError(err?.message ?? 'Failed to start checkout.')
      setCheckoutApp(null)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Billing & Limits</h1>
        <p className="text-sm text-slate-600">Manage your organisation subscription seats for ETL and StoQR.</p>
      </div>

      {error ? <Alert variant="destructive" title="Billing action failed">{error}</Alert> : null}
      {success ? <Alert variant="success" title="Saved">{success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>{orgName || 'Organisation'} subscription</CardTitle>
          <CardDescription>Single organisation subscription with app-specific seat limits.</CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Loading billing summary...
            </div>
          ) : (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-slate-600">Subscription status:</span>
              <Badge variant={hasSubscription ? 'success' : 'neutral'}>{hasSubscription ? 'Active' : 'No seats'}</Badge>
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 md:grid-cols-2">
        {apps.map((app) => (
          <Card key={app.appCode}>
            <CardHeader>
              <CardTitle>{app.appName}</CardTitle>
              <CardDescription>
                Assigned {app.assignedSeats} / {app.seatLimit} seats
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              <label className="block text-sm font-medium text-slate-700" htmlFor={`seat-limit-${app.appCode}`}>
                Seat limit
              </label>
              <Input
                id={`seat-limit-${app.appCode}`}
                inputMode="numeric"
                value={seatLimitDrafts[app.appCode] ?? '0'}
                onChange={(event) => {
                  const nextValue = event.target.value.replace(/[^0-9]/g, '')
                  setSeatLimitDrafts((previous) => ({ ...previous, [app.appCode]: nextValue }))
                }}
              />
              <Button
                onClick={() => {
                  void handleSaveLimit(app.appCode)
                }}
                disabled={savingApp === app.appCode}
              >
                {savingApp === app.appCode ? 'Saving...' : 'Update limit'}
              </Button>
              <Button
                variant="outline"
                onClick={() => {
                  void handleStartCheckout(app.appCode)
                }}
                disabled={checkoutApp === app.appCode}
              >
                {checkoutApp === app.appCode ? 'Opening...' : 'Checkout'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Recent activity</CardTitle>
          <CardDescription>Latest billing and seat assignment actions in your organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          {activityLoading ? (
            <div className="flex items-center gap-2 text-sm text-slate-500">
              <Spinner size="sm" />
              Loading activity...
            </div>
          ) : auditEvents.length === 0 ? (
            <p className="text-sm text-slate-500">No recent activity.</p>
          ) : (
            <div className="space-y-3">
              {auditEvents.map((event) => (
                <div key={event.id} className="rounded-md border border-slate-200 p-3">
                  <p className="text-sm font-medium text-slate-900">
                    {actionLabelMap[event.action] ?? event.action}
                    {event.appCode ? ` (${event.appCode.toUpperCase()})` : ''}
                  </p>
                  <p className="text-xs text-slate-500">
                    By {event.actorFullName ?? event.actorEmail ?? 'Unknown user'} • {new Date(event.createdAt).toLocaleString()}
                  </p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
