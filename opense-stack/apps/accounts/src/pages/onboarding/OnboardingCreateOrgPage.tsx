import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Alert,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  Input,
} from '@repo/ui'
import { createFreeTierOrganisation, FREE_TIER_SEATS } from '../../api/onboarding'
import type { AppCode } from '../../api/organisationBilling'

const appOptions: { code: AppCode; name: string }[] = [
  { code: 'etl', name: 'ETL' },
  { code: 'stoqr', name: 'StoQR' },
]

export const OnboardingCreateOrgPage = () => {
  const navigate = useNavigate()
  const [name, setName] = useState('')
  const [estimatedPeople, setEstimatedPeople] = useState<string>('')
  const [selectedApps, setSelectedApps] = useState<AppCode[]>(['etl', 'stoqr'])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const toggleApp = (code: AppCode) => {
    setSelectedApps((prev) =>
      prev.includes(code) ? prev.filter((a) => a !== code) : [...prev, code]
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const trimmedName = name.trim()
    if (!trimmedName) {
      setError('Organisation name is required')
      setLoading(false)
      return
    }

    if (selectedApps.length === 0) {
      setError('Select at least one app to allocate seats for')
      setLoading(false)
      return
    }

    try {
      const estimated = estimatedPeople ? parseInt(estimatedPeople, 10) : null
      if (estimated !== null && (isNaN(estimated) || estimated < 1)) {
        setError('Estimated people must be a positive number')
        setLoading(false)
        return
      }

      const orgId = await createFreeTierOrganisation(
        trimmedName,
        estimated,
        selectedApps
      )
      navigate('/onboarding/invite', { state: { orgId }, replace: true })
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Failed to create organisation')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="mx-auto max-w-2xl space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Create your organisation</h1>
        <p className="mt-1 text-sm text-slate-600">
          Set up your organisation to get started. You can invite members in the next step.
        </p>
      </div>

      {error && (
        <Alert variant="destructive" title="Error">
          {error}
        </Alert>
      )}

      <form onSubmit={handleSubmit}>
        <Card>
          <CardHeader>
            <CardTitle>Organisation details</CardTitle>
            <CardDescription>Basic information about your organisation.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Organisation name
              </label>
              <Input
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Acme Inc"
                required
                autoFocus
              />
            </div>

            <div>
              <label className="mb-2 block text-sm font-medium text-slate-700">
                Estimated number of people
              </label>
              <Input
                type="number"
                min={1}
                value={estimatedPeople}
                onChange={(e) => setEstimatedPeople(e.target.value)}
                placeholder="e.g. 10"
              />
              <p className="mt-1 text-xs text-slate-500">Optional. Helps with sizing.</p>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6">
          <CardHeader>
            <CardTitle>App seat allocation</CardTitle>
            <CardDescription>
              Choose which apps to allocate seats for. Free tier includes {FREE_TIER_SEATS} seats
              per app.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-3">
            {appOptions.map(({ code, name: appName }) => (
              <label
                key={code}
                className="flex cursor-pointer items-center justify-between rounded-lg border border-slate-200 p-4 hover:bg-slate-50"
              >
                <div className="flex items-center gap-3">
                  <input
                    type="checkbox"
                    checked={selectedApps.includes(code)}
                    onChange={() => toggleApp(code)}
                    className="h-4 w-4 rounded border-slate-300"
                  />
                  <span className="font-medium text-slate-900">{appName}</span>
                </div>
                <span className="text-sm text-slate-500">
                  {FREE_TIER_SEATS} seats
                </span>
              </label>
            ))}
          </CardContent>
        </Card>

        <div className="mt-6 flex justify-end">
          <Button type="submit" disabled={loading}>
            {loading ? 'Creating...' : 'Continue'}
          </Button>
        </div>
      </form>
    </div>
  )
}
