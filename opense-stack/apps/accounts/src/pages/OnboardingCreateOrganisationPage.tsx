import { useState } from 'react'
import type { FormEvent } from 'react'
import { useNavigate } from 'react-router-dom'
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Checkbox, Input, Select } from '@repo/ui'
import { createOrganisationForOnboarding, type AppCode } from '../api/onboarding'
import { buildPathWithQuery } from '../lib/redirect'

const appOptions: { code: AppCode; name: string }[] = [
  { code: 'etl', name: 'ETL' },
  { code: 'stoqr', name: 'StoQR' },
]

const sizeOptions = [
  { value: '1-5', label: '1-5 people' },
  { value: '6-20', label: '6-20 people' },
  { value: '21-50', label: '21-50 people' },
  { value: '51+', label: '51+ people' },
]

export const OnboardingCreateOrganisationPage = () => {
  const navigate = useNavigate()
  const [orgName, setOrgName] = useState('')
  const [estimatedPeople, setEstimatedPeople] = useState('')
  const [selectedApps, setSelectedApps] = useState<AppCode[]>(['etl', 'stoqr'])
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

    if (!orgName.trim()) {
      setError('Organisation name is required.')
      return
    }

    if (!estimatedPeople) {
      setError('Please choose an estimated team size.')
      return
    }

    if (selectedApps.length === 0) {
      setError('Select at least one app for free-tier seats.')
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
      const message = err instanceof Error ? err.message : 'Failed to create organisation.'
      setError(message)
      setSaving(false)
    }
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create your organisation</h1>
        <p className="text-sm text-slate-600">Set up your organisation and choose app seat allocation. Free tier includes 5 seats per selected app.</p>
      </div>

      {error ? <Alert variant="destructive" title="Unable to create organisation">{error}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Organisation details</CardTitle>
          <CardDescription>These details are used to set up your primary organisation.</CardDescription>
        </CardHeader>
        <CardContent>
          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="onboarding-org-name">
                Organisation name
              </label>
              <Input
                id="onboarding-org-name"
                value={orgName}
                onChange={(event) => setOrgName(event.target.value)}
                placeholder="Enter organisation name"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-700" htmlFor="onboarding-estimated-people">
                Estimated number of people
              </label>
              <Select
                id="onboarding-estimated-people"
                value={estimatedPeople}
                onChange={(event) => setEstimatedPeople(event.target.value)}
                options={sizeOptions}
                placeholder="Select size"
                disabled={saving}
              />
            </div>

            <div className="space-y-2">
              <p className="text-sm font-medium text-slate-700">App seat allocation (free tier = 5 seats per app)</p>
              <div className="space-y-2">
                {appOptions.map((app) => (
                  <Checkbox
                    key={app.code}
                    checked={selectedApps.includes(app.code)}
                    onChange={(event) => toggleApp(app.code, event.target.checked)}
                    label={`${app.name} (5 seats)`}
                    disabled={saving}
                  />
                ))}
              </div>
            </div>

            <Button type="submit" disabled={saving}>
              {saving ? 'Creating...' : 'Create organisation'}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
