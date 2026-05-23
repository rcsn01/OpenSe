import { useEffect, useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Badge, Button, Checkbox, Input, Select } from '@repo/ui'
import { AppWindow, Building2, CheckCircle2, Users } from 'lucide-react'
import { createOrganisationForOnboarding, getOnboardingInstancePolicy, type AppCode, type OnboardingInstancePolicy } from '../api/onboarding'
import { AccountsField, AccountsSection } from '../components/AccountsPageShell'
import { OnboardingShell } from '../components/OnboardingShell'
import { buildPathWithQuery } from '../lib/redirect'
import {
  formatSeatLimit,
  formatSeatLimitLabel,
  getOnboardingAppSeatSummary,
  getOnboardingSelectedSeatTotal,
  onboardingAppOptions,
  onboardingSizeOptions,
  validateOnboardingOrganisationForm,
} from '../lib/onboardingUi'

const getErrorMessage = (error: unknown, fallback: string) => {
  if (error instanceof Error) return error.message
  if (error && typeof error === 'object' && 'message' in error) {
    const message = (error as { message?: unknown }).message
    if (typeof message === 'string' && message.trim()) return message
  }
  return fallback
}

export const OnboardingCreateOrganisationPage = () => {
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState('')
  const [estimatedPeople, setEstimatedPeople] = useState('')
  const [selectedApps, setSelectedApps] = useState<AppCode[]>(['etl', 'stoqr'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [policy, setPolicy] = useState<OnboardingInstancePolicy | null>(null)
  const [policyLoading, setPolicyLoading] = useState(true)

  useEffect(() => {
    const loadPolicy = async () => {
      try {
        setPolicyLoading(true)
        setError(null)
        setPolicy(await getOnboardingInstancePolicy())
      } catch (err: unknown) {
        setError(err instanceof Error ? err.message : 'Failed to load instance policy.')
      } finally {
        setPolicyLoading(false)
      }
    }

    void loadPolicy()
  }, [])

  const toggleApp = (appCode: AppCode, checked: boolean) => {
    setSelectedApps((previous) => {
      if (checked) {
        if (previous.includes(appCode)) return previous
        return [...previous, appCode]
      }
      return previous.filter((value) => value !== appCode)
    })
  }

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (policy && !policy.canCreateOrganisation) {
      setError(`This OpenSe instance already has ${policy.organisationCount} of ${policy.maxOrganisations} organisation slots in use.`)
      return
    }

    const validationError = validateOnboardingOrganisationForm({
      orgName,
      estimatedPeople,
      selectedApps,
    })
    if (validationError) {
      setError(validationError)
      return
    }

    try {
      setSaving(true)
      setError(null)
      await createOrganisationForOnboarding({
        name: orgName,
        selectedApps,
      })
      navigate(buildPathWithQuery('/onboarding/invite-members'), { replace: true })
    } catch (err: unknown) {
      setError(getErrorMessage(err, 'Failed to create organisation.'))
      setSaving(false)
    }
  }

  const freeSeatLimit = policy?.freeSeatLimit ?? null
  const seatSummary = getOnboardingAppSeatSummary(selectedApps, freeSeatLimit)
  const seatTotal = getOnboardingSelectedSeatTotal(selectedApps, freeSeatLimit)
  const selectedAppNames = seatSummary.filter((app) => app.selected).map((app) => app.name)
  const blocked = policyLoading || policy?.canCreateOrganisation === false

  return (
    <OnboardingShell
      title="Create your organisation"
      description={`Set up your workspace identity and choose the apps that should receive ${formatSeatLimitLabel(freeSeatLimit)}.`}
      currentStep="create"
      alert={
        <>
          {policy?.canCreateOrganisation === false ? (
            <Alert variant="info" title="Organisation limit reached">
              This OpenSe instance is configured for {policy.maxOrganisations} organisation{policy.maxOrganisations === 1 ? '' : 's'}. Ask the instance operator to raise the limit before creating another organisation.
            </Alert>
          ) : null}
          {error ? <Alert variant="destructive" title="Unable to create organisation">{error}</Alert> : null}
        </>
      }
    >
      <form className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]" onSubmit={handleSubmit}>
        <div className="grid gap-5">
          <AccountsSection title="Organisation identity" description="This name appears in Accounts and connected OpenSe apps.">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-body)]" htmlFor="onboarding-org-name">
                <Building2 className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                Organisation name
              </label>
              <Input
                id="onboarding-org-name"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Enter organisation name"
                disabled={saving || blocked}
              />
            </div>
          </AccountsSection>

          <AccountsSection title="Estimated team size" description="Used only to tailor setup guidance during onboarding.">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm font-medium text-[var(--color-body)]" htmlFor="onboarding-estimated-people">
                <Users className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                Estimated number of people
              </label>
              <Select
                id="onboarding-estimated-people"
                value={estimatedPeople}
                onChange={(event) => setEstimatedPeople(event.target.value)}
                options={onboardingSizeOptions}
                placeholder="Select size"
                disabled={saving || blocked}
              />
            </div>
          </AccountsSection>

          <AccountsSection title="App access" description={`Selected apps receive ${formatSeatLimitLabel(freeSeatLimit)}. Unselected apps start with 0 seats.`}>
            <div className="grid gap-3 sm:grid-cols-2">
              {onboardingAppOptions.map((app) => {
                const checked = selectedApps.includes(app.code)
                return (
                  <div
                    key={app.code}
                    className="flex min-h-24 flex-col justify-between gap-4 border border-[var(--color-border)] bg-[var(--color-surface)] p-4"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <AppWindow className="h-4 w-4 text-[var(--color-muted-foreground)]" />
                          <span className="text-sm font-semibold text-[var(--color-heading)]">{app.name}</span>
                        </div>
                        <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                          {checked ? `${formatSeatLimit(freeSeatLimit)} seats enabled` : 'No seats allocated'}
                        </p>
                      </div>
                      <Badge variant={checked ? 'success' : 'neutral'}>{checked ? 'Selected' : '0 seats'}</Badge>
                    </div>
                    <Checkbox
                      id={`onboarding-app-${app.code}`}
                      checked={checked}
                      onChange={(event) => toggleApp(app.code, event.target.checked)}
                      label={`Enable ${app.name}`}
                      disabled={saving || blocked}
                    />
                  </div>
                )
              })}
            </div>
          </AccountsSection>
        </div>

        <aside className="space-y-5">
          <AccountsSection title="Setup summary">
            <dl className="grid gap-4">
              <AccountsField label="Organisation" value={orgName.trim() || 'Not set'} />
              <AccountsField label="Team size" value={onboardingSizeOptions.find((option) => option.value === estimatedPeople)?.label ?? 'Not set'} />
              <AccountsField label="Selected apps" value={selectedAppNames.length > 0 ? selectedAppNames.join(', ') : 'None'} />
              <AccountsField label="Free seats" value={seatTotal === null ? 'Unlimited' : `${seatTotal} total`} />
            </dl>
          </AccountsSection>

          <AccountsSection title="Next step">
            <div className="space-y-4">
              <div className="space-y-2">
                {seatSummary.map((app) => (
                  <div key={app.code} className="flex items-center justify-between gap-3 text-sm">
                    <span className="text-[var(--color-body)]">{app.name}</span>
                    <span className="font-medium text-[var(--color-heading)]">{formatSeatLimitLabel(app.seats)}</span>
                  </div>
                ))}
              </div>
              <div className="flex items-start gap-2 border-t border-[var(--color-border)] pt-4 text-sm text-[var(--color-muted-foreground)]">
                <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-[var(--color-success)]" />
                <span>After creation, invite members or finish onboarding.</span>
              </div>
              <Button type="submit" className="w-full" disabled={saving || blocked}>
                {policyLoading ? 'Loading...' : saving ? 'Creating...' : 'Create organisation'}
              </Button>
            </div>
          </AccountsSection>
        </aside>
      </form>
    </OnboardingShell>
  )
}
