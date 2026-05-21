import { useEffect, useState } from 'react'
import { Badge, Button, DataTable, Input, type DataTableColumn } from '@repo/ui'
import { Download, KeyRound, LogOut, ShieldCheck, Trash2 } from 'lucide-react'
import { AccountsAlert, AccountsField, AccountsPageShell, AccountsSection } from '../components/AccountsPageShell'
import {
  changeAccountPassword,
  deleteAccount,
  enrollTotpFactor,
  exportAccountData,
  getCurrentSessionSummary,
  listMfaFactors,
  requestRecoveryEmailChange,
  signOutSessionScope,
  unenrollMfaFactor,
  verifyTotpFactor,
  type AccountSessionSummary,
  type MfaEnrollment,
  type MfaFactor,
} from '../api/security'
import { getAccountProfile } from '../api/profile'

export const SecurityPage = () => {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [recoveryEmail, setRecoveryEmail] = useState('')
  const [session, setSession] = useState<AccountSessionSummary | null>(null)
  const [mfaFactors, setMfaFactors] = useState<MfaFactor[]>([])
  const [enrollment, setEnrollment] = useState<MfaEnrollment | null>(null)
  const [verificationCode, setVerificationCode] = useState('')
  const [deleteConfirmation, setDeleteConfirmation] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadSecurity = async () => {
    try {
      setLoading(true)
      setError(null)
      const [nextSession, nextFactors, profile] = await Promise.all([
        getCurrentSessionSummary(),
        listMfaFactors(),
        getAccountProfile(),
      ])
      setSession(nextSession)
      setMfaFactors(nextFactors)
      setRecoveryEmail(profile.recoveryEmail ?? '')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load security settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadSecurity()
  }, [])

  const runAction = async (key: string, action: () => Promise<void>, message: string) => {
    try {
      setSavingKey(key)
      setError(null)
      setSuccess(null)
      await action()
      setSuccess(message)
      await loadSecurity()
    } catch (err: any) {
      setError(err?.message ?? 'Security action failed.')
    } finally {
      setSavingKey(null)
    }
  }

  const handlePasswordUpdate = async () => {
    if (password !== confirmPassword) {
      setError('Password confirmation does not match.')
      return
    }

    await runAction('password', async () => {
      await changeAccountPassword(password)
      setPassword('')
      setConfirmPassword('')
    }, 'Password updated.')
  }

  const handleExport = async () => {
    try {
      setSavingKey('export')
      setError(null)
      const data = await exportAccountData()
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
      const url = URL.createObjectURL(blob)
      const anchor = document.createElement('a')
      anchor.href = url
      anchor.download = 'opense-account-export.json'
      anchor.click()
      URL.revokeObjectURL(url)
      setSuccess('Account export generated.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to export account data.')
    } finally {
      setSavingKey(null)
    }
  }

  const columns: Array<DataTableColumn<MfaFactor>> = [
    { id: 'type', header: 'Factor', renderCell: (factor) => factor.friendlyName ?? factor.factorType.toUpperCase() },
    {
      id: 'status',
      header: 'Status',
      renderCell: (factor) => <Badge variant={factor.status === 'verified' ? 'success' : 'neutral'}>{factor.status}</Badge>,
    },
    { id: 'created', header: 'Created', renderCell: (factor) => factor.createdAt ? new Date(factor.createdAt).toLocaleString() : '-' },
    {
      id: 'action',
      header: 'Action',
      renderCell: (factor) => (
        <Button
          variant="outline"
          size="sm"
          disabled={savingKey === factor.id}
          onClick={() => void runAction(factor.id, () => unenrollMfaFactor(factor.id), 'MFA factor removed.')}
        >
          <Trash2 className="h-4 w-4" />
          Remove
        </Button>
      ),
    },
  ]

  return (
    <AccountsPageShell
      title="Security"
      description="Manage sign-in credentials, MFA, sessions, and account self-service actions."
      loading={loading}
      loadingLabel="Loading security settings..."
      alert={<AccountsAlert error={error} success={success} errorTitle="Security action failed" />}
    >
      <div className="grid gap-5 xl:grid-cols-2">
        <AccountsSection title="Password" description="Set a new password for this account.">
          <div className="grid gap-4">
            <Input id="security-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="New password" />
            <Input id="security-password-confirm" type="password" value={confirmPassword} onChange={(event) => setConfirmPassword(event.target.value)} placeholder="Confirm new password" />
            <Button className="w-fit" onClick={() => void handlePasswordUpdate()} disabled={savingKey === 'password'}>
              <KeyRound className="h-4 w-4" />
              {savingKey === 'password' ? 'Updating...' : 'Update password'}
            </Button>
          </div>
        </AccountsSection>

        <AccountsSection title="Recovery email" description="Store a recovery contact for account support workflows.">
          <div className="flex flex-col gap-3 sm:flex-row">
            <Input id="security-recovery-email" value={recoveryEmail} onChange={(event) => setRecoveryEmail(event.target.value)} placeholder="recovery@example.com" />
            <Button className="shrink-0" onClick={() => void runAction('recovery', () => requestRecoveryEmailChange(recoveryEmail), 'Recovery email updated.')} disabled={savingKey === 'recovery'}>
              Save
            </Button>
          </div>
        </AccountsSection>

        <AccountsSection title="Multi-factor authentication" description="Enroll an authenticator app and manage verified factors.">
          <div className="space-y-4">
            <DataTable
              variant="operational"
              rows={mfaFactors}
              columns={columns}
              getRowId={(factor) => factor.id}
              emptyState="No MFA factors enrolled."
              minTableWidth="42rem"
            />
            {enrollment ? (
              <div className="grid gap-3 border border-[var(--color-border)] bg-[var(--color-surface-subtle)] p-3">
                {enrollment.qrCode ? <img className="h-36 w-36" src={enrollment.qrCode} alt="Authenticator QR code" /> : null}
                {enrollment.secret ? <p className="break-all text-xs text-[var(--color-muted-foreground)]">{enrollment.secret}</p> : null}
                <div className="flex flex-col gap-2 sm:flex-row">
                  <Input value={verificationCode} onChange={(event) => setVerificationCode(event.target.value)} placeholder="Verification code" />
                  <Button onClick={() => void runAction('mfa-verify', () => verifyTotpFactor(enrollment.factorId, verificationCode), 'MFA factor verified.')} disabled={savingKey === 'mfa-verify'}>
                    Verify
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outline" onClick={() => void runAction('mfa-enroll', async () => setEnrollment(await enrollTotpFactor()), 'MFA enrollment started.')} disabled={savingKey === 'mfa-enroll'}>
                <ShieldCheck className="h-4 w-4" />
                Enroll authenticator
              </Button>
            )}
          </div>
        </AccountsSection>

        <AccountsSection title="Current session" description="Review this browser session and sign out by scope.">
          <dl className="mb-4 grid gap-4 sm:grid-cols-2">
            <AccountsField label="Email" value={session?.email ?? '-'} />
            <AccountsField label="Expires" value={session?.expiresAt ? new Date(session.expiresAt).toLocaleString() : '-'} />
            <AccountsField label="Last sign in" value={session?.lastSignInAt ? new Date(session.lastSignInAt).toLocaleString() : '-'} />
            <AccountsField label="User ID" value={<span className="break-all">{session?.userId ?? '-'}</span>} />
          </dl>
          <div className="flex flex-wrap gap-2">
            <Button variant="outline" size="sm" onClick={() => void runAction('signout-local', () => signOutSessionScope('local'), 'Signed out current session.')} disabled={Boolean(savingKey)}>
              <LogOut className="h-4 w-4" />
              Current
            </Button>
            <Button variant="outline" size="sm" onClick={() => void runAction('signout-others', () => signOutSessionScope('others'), 'Other sessions revoked.')} disabled={Boolean(savingKey)}>
              Other sessions
            </Button>
            <Button variant="outline" size="sm" onClick={() => void runAction('signout-global', () => signOutSessionScope('global'), 'All sessions revoked.')} disabled={Boolean(savingKey)}>
              All sessions
            </Button>
          </div>
        </AccountsSection>

        <AccountsSection title="Account data" description="Export account data or permanently delete this account.">
          <div className="grid gap-4">
            <Button className="w-fit" variant="outline" onClick={() => void handleExport()} disabled={savingKey === 'export'}>
              <Download className="h-4 w-4" />
              Export account
            </Button>
            <div className="grid gap-2 border border-[var(--color-destructive)] p-3">
              <p className="text-sm text-[var(--color-muted-foreground)]">Type DELETE to permanently delete the authenticated account.</p>
              <Input value={deleteConfirmation} onChange={(event) => setDeleteConfirmation(event.target.value)} placeholder="DELETE" />
              <Button
                className="w-fit"
                variant="destructive"
                onClick={() => void runAction('delete', () => deleteAccount(deleteConfirmation), 'Account deleted.')}
                disabled={savingKey === 'delete' || deleteConfirmation !== 'DELETE'}
              >
                <Trash2 className="h-4 w-4" />
                Delete account
              </Button>
            </div>
          </div>
        </AccountsSection>
      </div>
    </AccountsPageShell>
  )
}
