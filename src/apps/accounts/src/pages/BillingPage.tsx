import { useEffect, useMemo, useState } from 'react'
import { useSearchParams } from 'react-router-dom'
import { Badge, Button, Input } from '@repo/ui'
import { CreditCard, ExternalLink, Save } from 'lucide-react'
import { AccountsAlert, AccountsField, AccountsPageShell, AccountsSection } from '../components/AccountsPageShell'
import {
  accountAppCodes,
  createBillingPortalSession,
  formatAppCodeLabel,
  createCheckoutForSeatLimit,
  getOrganisationBillingSummary,
  updateSeatLimit,
  type AppCode,
  type AppSeatBillingSummary,
  type OrgContext,
} from '../api/organisationBilling'
import { canManageOrganisation, updateBillingContact } from '../api/organisation'

const formatSeatLimit = (seatLimit: number | null) => (seatLimit === null ? 'Unlimited' : String(seatLimit))
const isWithinLimit = (assignedSeats: number, seatLimit: number | null) => seatLimit === null || assignedSeats <= seatLimit
const getErrorMessage = (error: unknown, fallback: string) =>
  error instanceof Error ? error.message : fallback
const getSeatLimitDrafts = (apps: AppSeatBillingSummary[]): Record<AppCode, string> =>
  Object.fromEntries(
    accountAppCodes.map((appCode) => {
      const seatLimit = apps.find((app) => app.appCode === appCode)?.seatLimit
      return [appCode, seatLimit === null ? '' : String(seatLimit ?? 0)]
    }),
  ) as Record<AppCode, string>

export const BillingPage = () => {
  const [searchParams, setSearchParams] = useSearchParams()
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)
  const [organisation, setOrganisation] = useState<OrgContext | null>(null)
  const [apps, setApps] = useState<AppSeatBillingSummary[]>([])
  const [seatLimitDrafts, setSeatLimitDrafts] = useState<Record<AppCode, string>>(() => getSeatLimitDrafts([]))
  const [billingName, setBillingName] = useState('')
  const [billingEmail, setBillingEmail] = useState('')
  const [billingPhone, setBillingPhone] = useState('')

  const canManageBilling = canManageOrganisation(organisation?.role)
  const hasSubscription = useMemo(() => apps.some((app) => app.seatLimit === null || app.seatLimit > 0 || app.assignedSeats > 0), [apps])

  const loadSummary = async () => {
    try {
      setLoading(true)
      setError(null)
      const summary = await getOrganisationBillingSummary()
      setOrganisation(summary.organisation)
      setApps(summary.apps)
      setBillingName(summary.organisation.billingName ?? '')
      setBillingEmail(summary.organisation.billingEmail ?? '')
      setBillingPhone(summary.organisation.billingPhone ?? '')
      setSeatLimitDrafts(getSeatLimitDrafts(summary.apps))
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to load billing information.'))
    } finally {
      setLoading(false)
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
    const parsed = Number(seatLimitDrafts[appCode]?.trim() ?? '')
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Seat limit must be a non-negative integer.')
      return
    }

    try {
      setSavingKey(`limit:${appCode}`)
      setError(null)
      setSuccess(null)
      await updateSeatLimit(appCode, parsed)
      setSuccess(`${formatAppCodeLabel(appCode)} seat limit updated.`)
      await loadSummary()
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update seat limit.'))
    } finally {
      setSavingKey(null)
    }
  }

  const handleStartCheckout = async (appCode: AppCode) => {
    const parsed = Number(seatLimitDrafts[appCode]?.trim() ?? '')
    if (!Number.isInteger(parsed) || parsed < 0) {
      setError('Seat limit must be a non-negative integer.')
      return
    }

    try {
      setSavingKey(`checkout:${appCode}`)
      setError(null)
      const url = await createCheckoutForSeatLimit(appCode, parsed)
      window.location.href = url
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to start checkout.'))
      setSavingKey(null)
    }
  }

  const handlePortal = async () => {
    try {
      setSavingKey('portal')
      setError(null)
      const url = await createBillingPortalSession()
      window.location.href = url
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to open billing portal.'))
      setSavingKey(null)
    }
  }

  const handleSaveBillingContact = async () => {
    try {
      setSavingKey('billing-contact')
      setError(null)
      setSuccess(null)
      const nextOrganisation = await updateBillingContact({ billingName, billingEmail, billingPhone })
      setOrganisation((previous) => previous ? {
        ...previous,
        billingName: nextOrganisation.billingName,
        billingEmail: nextOrganisation.billingEmail,
        billingPhone: nextOrganisation.billingPhone,
      } : previous)
      setSuccess('Billing contact updated.')
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to update billing contact.'))
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <AccountsPageShell
      title="Billing"
      description="Manage subscription status, app seat limits, billing contacts, invoices, and payment methods."
      loading={loading}
      loadingLabel="Loading billing..."
      alert={<AccountsAlert error={error} success={success} errorTitle="Billing action failed" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => void handlePortal()} disabled={!canManageBilling || savingKey === 'portal' || !organisation?.stripeCustomerId}>
          <ExternalLink className="h-4 w-4" />
          Billing portal
        </Button>
      }
    >
      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_24rem]">
        <AccountsSection title={`${organisation?.orgName ?? 'Organisation'} subscription`} description={canManageBilling ? 'Owners and admins can update limits and checkout.' : 'Your role can view billing context but cannot manage subscription settings.'}>
          <div className="grid gap-4 md:grid-cols-3">
            <AccountsField label="Status" value={<Badge variant={hasSubscription ? 'success' : 'neutral'}>{hasSubscription ? 'Active' : 'No seats'}</Badge>} />
            <AccountsField label="Stripe customer" value={organisation?.stripeCustomerId ?? 'Not linked'} />
            <AccountsField label="Subscription" value={organisation?.stripeSubscriptionId ?? 'Not linked'} />
          </div>
        </AccountsSection>

        <AccountsSection title="Billing contact" actions={canManageBilling ? (
          <Button size="sm" onClick={() => void handleSaveBillingContact()} disabled={savingKey === 'billing-contact'}>
            <Save className="h-4 w-4" />
            Save
          </Button>
        ) : null}>
          <div className="grid gap-3">
            <Input value={billingName} onChange={(event) => setBillingName(event.target.value)} placeholder="Billing name" disabled={!canManageBilling} />
            <Input value={billingEmail} onChange={(event) => setBillingEmail(event.target.value)} placeholder="billing@example.com" disabled={!canManageBilling} />
            <Input value={billingPhone} onChange={(event) => setBillingPhone(event.target.value)} placeholder="Phone" disabled={!canManageBilling} />
            {!canManageBilling ? <p className="text-sm text-[var(--color-muted-foreground)]">Only owners and admins can update billing contacts.</p> : null}
          </div>
        </AccountsSection>

        <div className="grid gap-4 xl:col-span-2 md:grid-cols-2">
          {apps.map((app) => (
            <AccountsSection
              key={app.appCode}
              title={app.appName}
              description={`Assigned ${app.assignedSeats} of ${formatSeatLimit(app.seatLimit)} seats`}
              actions={<Badge variant={isWithinLimit(app.assignedSeats, app.seatLimit) ? 'success' : 'warning'}>{app.assignedSeats}/{formatSeatLimit(app.seatLimit)}</Badge>}
            >
              <div className="grid gap-3">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor={`seat-limit-${app.appCode}`}>
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
                  disabled={!canManageBilling}
                />
                {app.seatLimit === null ? (
                  <p className="text-xs text-[var(--color-muted-foreground)]">This app is currently unlimited. Enter a finite seat count to switch to self-service billing.</p>
                ) : null}
                <div className="flex flex-wrap gap-2">
                  <Button variant="outline" onClick={() => void handleSaveLimit(app.appCode)} disabled={!canManageBilling || savingKey === `limit:${app.appCode}`}>
                    <Save className="h-4 w-4" />
                    {savingKey === `limit:${app.appCode}` ? 'Saving...' : 'Update limit'}
                  </Button>
                  <Button onClick={() => void handleStartCheckout(app.appCode)} disabled={!canManageBilling || savingKey === `checkout:${app.appCode}`}>
                    <CreditCard className="h-4 w-4" />
                    {savingKey === `checkout:${app.appCode}` ? 'Opening...' : 'Checkout'}
                  </Button>
                </div>
              </div>
            </AccountsSection>
          ))}
        </div>
      </div>
    </AccountsPageShell>
  )
}
