import { useState } from 'react'
import { Alert, Button, Card, CardContent, CardDescription, CardHeader, CardTitle, Input } from '@repo/ui'
import { updateAuthFullName, updatePassword, updateProfileFullName } from '@repo/shared/auth'
import { useAuth } from '@repo/shared/auth/context'

export const AccountSettingsPage = () => {
  const { user } = useAuth()
  const [fullName, setFullName] = useState(user?.user_metadata?.full_name ?? '')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [savingName, setSavingName] = useState(false)
  const [savingPassword, setSavingPassword] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const handleSaveName = async () => {
    if (!user?.id) {
      setError('Unable to update profile: missing user context.')
      return
    }

    const nextName = fullName.trim()
    if (!nextName) {
      setError('Full name cannot be empty.')
      return
    }

    try {
      setSavingName(true)
      setError(null)
      setSuccess(null)
      await Promise.all([
        updateProfileFullName(user.id, nextName),
        updateAuthFullName(nextName),
      ])
      setSuccess('Account name updated.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update account name.')
    } finally {
      setSavingName(false)
    }
  }

  const handleUpdatePassword = async () => {
    if (!password) {
      setError('Password is required.')
      return
    }

    if (password !== confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }

    try {
      setSavingPassword(true)
      setError(null)
      setSuccess(null)
      await updatePassword(password)
      setPassword('')
      setConfirmPassword('')
      setSuccess('Password updated.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update password.')
    } finally {
      setSavingPassword(false)
    }
  }

  return (
    <div className="space-y-6 p-6">
      <div>
        <h1 className="text-2xl font-semibold text-slate-900">Account Settings</h1>
        <p className="text-sm text-slate-600">Manage your personal account details and sign-in security.</p>
      </div>

      {error ? <Alert variant="destructive" title="Unable to save settings">{error}</Alert> : null}
      {success ? <Alert variant="success" title="Saved">{success}</Alert> : null}

      <Card>
        <CardHeader>
          <CardTitle>Profile</CardTitle>
          <CardDescription>Update the full name shown across OpenSe apps.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="account-full-name">
            Full name
          </label>
          <Input
            id="account-full-name"
            value={fullName}
            onChange={(event) => setFullName(event.target.value)}
            placeholder="Enter your full name"
          />
          <Button onClick={() => void handleSaveName()} disabled={savingName}>
            {savingName ? 'Saving...' : 'Save name'}
          </Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Security</CardTitle>
          <CardDescription>Set a new password for your account.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-3">
          <label className="block text-sm font-medium text-slate-700" htmlFor="account-password">
            New password
          </label>
          <Input
            id="account-password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            placeholder="Enter new password"
          />
          <label className="block text-sm font-medium text-slate-700" htmlFor="account-password-confirm">
            Confirm new password
          </label>
          <Input
            id="account-password-confirm"
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            placeholder="Re-enter new password"
          />
          <Button onClick={() => void handleUpdatePassword()} disabled={savingPassword}>
            {savingPassword ? 'Updating...' : 'Update password'}
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}
