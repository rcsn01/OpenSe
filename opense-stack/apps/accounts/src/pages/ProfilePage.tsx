import { useEffect, useState } from 'react'
import { Avatar, Button, Input } from '@repo/ui'
import { Camera, RotateCcw, Save, Trash2 } from 'lucide-react'
import { useAuth } from '@repo/shared/auth/context'
import { AccountsAlert, AccountsField, AccountsPageShell, AccountsSection } from '../components/AccountsPageShell'
import {
  getAccountProfile,
  removeAccountAvatar,
  updateAccountProfile,
  uploadAccountAvatar,
  type AccountProfile,
} from '../api/profile'

export const ProfilePage = () => {
  const { user } = useAuth()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [profile, setProfile] = useState<AccountProfile | null>(null)
  const [fullName, setFullName] = useState('')
  const [username, setUsername] = useState('')
  const [avatarUrl, setAvatarUrl] = useState<string | null>(null)
  const [avatarStoragePath, setAvatarStoragePath] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const loadProfile = async () => {
    try {
      setLoading(true)
      setError(null)
      const nextProfile = await getAccountProfile()
      setProfile(nextProfile)
      setFullName(nextProfile.fullName ?? user?.user_metadata?.full_name ?? '')
      setUsername(nextProfile.username ?? '')
      setAvatarUrl(nextProfile.avatarUrl)
      setAvatarStoragePath(nextProfile.avatarStoragePath)
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load profile.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadProfile()
  }, [])

  const handleAvatarUpload = async (file: File | null) => {
    if (!file || !user?.id) return
    try {
      setSaving(true)
      setError(null)
      const uploaded = await uploadAccountAvatar(user.id, file)
      if (avatarStoragePath && avatarStoragePath !== uploaded.path) {
        await removeAccountAvatar(avatarStoragePath)
      }
      setAvatarUrl(uploaded.url)
      setAvatarStoragePath(uploaded.path)
      setSuccess('Avatar staged. Save profile to keep it.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to upload avatar.')
    } finally {
      setSaving(false)
    }
  }

  const handleSave = async () => {
    if (!user?.id) {
      setError('Unable to update profile: missing user context.')
      return
    }

    try {
      setSaving(true)
      setError(null)
      setSuccess(null)
      const nextProfile = await updateAccountProfile({
        userId: user.id,
        fullName,
        username,
        avatarUrl,
        avatarStoragePath,
      })
      setProfile(nextProfile)
      setSuccess('Profile updated.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update profile.')
    } finally {
      setSaving(false)
    }
  }

  const handleReset = () => {
    setFullName(profile?.fullName ?? '')
    setUsername(profile?.username ?? '')
    setAvatarUrl(profile?.avatarUrl ?? null)
    setAvatarStoragePath(profile?.avatarStoragePath ?? null)
    setError(null)
    setSuccess(null)
  }

  const handleRemoveAvatar = async () => {
    try {
      setSaving(true)
      setError(null)
      await removeAccountAvatar(avatarStoragePath)
      setAvatarUrl(null)
      setAvatarStoragePath(null)
      setSuccess('Avatar removed. Save profile to keep it.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to remove avatar.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <AccountsPageShell
      title="Profile"
      description="Manage the identity details shown across OpenSe apps."
      loading={loading}
      loadingLabel="Loading profile..."
      alert={<AccountsAlert error={error} success={success} errorTitle="Profile update failed" />}
      actions={
        <>
          <Button variant="outline" size="sm" onClick={handleReset} disabled={saving}>
            <RotateCcw className="h-4 w-4" />
            Cancel
          </Button>
          <Button size="sm" onClick={() => void handleSave()} disabled={saving}>
            <Save className="h-4 w-4" />
            {saving ? 'Saving...' : 'Save profile'}
          </Button>
        </>
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_22rem]">
        <AccountsSection title="Identity" description="Update your display name, username, and avatar.">
          <div className="grid gap-5 md:grid-cols-[9rem_minmax(0,1fr)]">
            <div className="flex flex-col items-start gap-3">
              <Avatar src={avatarUrl ?? undefined} alt={fullName || profile?.email || 'Account'} size="xl" />
              <label className="inline-flex h-8 cursor-pointer items-center justify-center gap-2 rounded-[var(--radius-md)] border border-[var(--color-border)] px-3 text-sm font-medium text-[var(--color-foreground)] hover:bg-[var(--color-muted)]">
                <Camera className="h-4 w-4" />
                Upload
                <input
                  className="sr-only"
                  type="file"
                  accept="image/png,image/jpeg,image/webp"
                  onChange={(event) => void handleAvatarUpload(event.target.files?.[0] ?? null)}
                  disabled={saving}
                />
              </label>
              <Button variant="ghost" size="sm" onClick={() => void handleRemoveAvatar()} disabled={saving || !avatarUrl}>
                <Trash2 className="h-4 w-4" />
                Remove
              </Button>
            </div>

            <div className="grid gap-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="profile-full-name">
                  Full name
                </label>
                <Input id="profile-full-name" value={fullName} onChange={(event) => setFullName(event.target.value)} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="profile-username">
                  Username
                </label>
                <Input id="profile-username" value={username} onChange={(event) => setUsername(event.target.value)} placeholder="Optional username" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="profile-email">
                  Current email
                </label>
                <Input id="profile-email" value={profile?.email ?? user?.email ?? ''} disabled readOnly />
              </div>
            </div>
          </div>
        </AccountsSection>

        <AccountsSection title="Profile metadata">
          <dl className="grid gap-4">
            <AccountsField label="Account ID" value={<span className="break-all">{profile?.id ?? user?.id ?? '-'}</span>} />
            <AccountsField label="Created" value={profile?.createdAt ? new Date(profile.createdAt).toLocaleString() : '-'} />
            <AccountsField label="Last updated" value={profile?.updatedAt ? new Date(profile.updatedAt).toLocaleString() : 'Not recorded'} />
          </dl>
        </AccountsSection>
      </div>
    </AccountsPageShell>
  )
}
