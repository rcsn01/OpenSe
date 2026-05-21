import { useEffect, useState } from 'react'
import { Badge, Button, Input } from '@repo/ui'
import { RotateCcw, Save } from 'lucide-react'
import { AccountsAlert, AccountsField, AccountsPageShell, AccountsSection } from '../components/AccountsPageShell'
import {
  canManageOrganisation,
  canTransferOwnership,
  getOrganisationProfile,
  transferOrganisationOwnership,
  updateOrganisationProfile,
  type OrganisationProfile,
} from '../api/organisation'
import { getSeatAssignmentSnapshot, type SeatMember } from '../api/seatAssignments'

export const OrganisationPage = () => {
  const [loading, setLoading] = useState(true)
  const [savingKey, setSavingKey] = useState<string | null>(null)
  const [organisation, setOrganisation] = useState<OrganisationProfile | null>(null)
  const [members, setMembers] = useState<SeatMember[]>([])
  const [orgName, setOrgName] = useState('')
  const [primaryContactName, setPrimaryContactName] = useState('')
  const [primaryContactEmail, setPrimaryContactEmail] = useState('')
  const [newOwnerUserId, setNewOwnerUserId] = useState('')
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState<string | null>(null)

  const canManage = canManageOrganisation(organisation?.role)
  const canTransfer = canTransferOwnership(organisation?.role)

  const loadOrganisation = async () => {
    try {
      setLoading(true)
      setError(null)
      const [nextOrganisation, seats] = await Promise.all([
        getOrganisationProfile(),
        getSeatAssignmentSnapshot(),
      ])
      setOrganisation(nextOrganisation)
      setMembers(seats.members)
      setOrgName(nextOrganisation.orgName)
      setPrimaryContactName(nextOrganisation.primaryContactName ?? '')
      setPrimaryContactEmail(nextOrganisation.primaryContactEmail ?? '')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load organisation settings.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadOrganisation()
  }, [])

  const handleSave = async () => {
    try {
      setSavingKey('profile')
      setError(null)
      setSuccess(null)
      const nextOrganisation = await updateOrganisationProfile({
        orgName,
        primaryContactName,
        primaryContactEmail,
      })
      setOrganisation(nextOrganisation)
      setSuccess('Organisation profile updated.')
    } catch (err: any) {
      setError(err?.message ?? 'Failed to update organisation profile.')
    } finally {
      setSavingKey(null)
    }
  }

  const handleReset = () => {
    setOrgName(organisation?.orgName ?? '')
    setPrimaryContactName(organisation?.primaryContactName ?? '')
    setPrimaryContactEmail(organisation?.primaryContactEmail ?? '')
    setError(null)
    setSuccess(null)
  }

  const handleTransfer = async () => {
    try {
      setSavingKey('transfer')
      setError(null)
      setSuccess(null)
      await transferOrganisationOwnership(newOwnerUserId)
      setSuccess('Ownership transferred.')
      setNewOwnerUserId('')
      await loadOrganisation()
    } catch (err: any) {
      setError(err?.message ?? 'Failed to transfer ownership.')
    } finally {
      setSavingKey(null)
    }
  }

  return (
    <AccountsPageShell
      title="Organisation"
      description="Manage organisation identity, ownership, and primary contact details."
      loading={loading}
      loadingLabel="Loading organisation..."
      alert={<AccountsAlert error={error} success={success} errorTitle="Organisation update failed" />}
      actions={
        canManage ? (
          <>
            <Button variant="outline" size="sm" onClick={handleReset} disabled={Boolean(savingKey)}>
              <RotateCcw className="h-4 w-4" />
              Cancel
            </Button>
            <Button size="sm" onClick={() => void handleSave()} disabled={Boolean(savingKey)}>
              <Save className="h-4 w-4" />
              {savingKey === 'profile' ? 'Saving...' : 'Save organisation'}
            </Button>
          </>
        ) : null
      }
    >
      <div className="grid gap-5 lg:grid-cols-[minmax(0,1fr)_24rem]">
        <AccountsSection title="Organisation profile" description={canManage ? 'Owners and admins can rename the organisation and update contacts.' : 'Your role can view organisation details.'}>
          <div className="grid gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="organisation-name">Organisation name</label>
              <Input id="organisation-name" value={orgName} onChange={(event) => setOrgName(event.target.value)} disabled={!canManage} />
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="organisation-primary-contact-name">Primary contact</label>
                <Input id="organisation-primary-contact-name" value={primaryContactName} onChange={(event) => setPrimaryContactName(event.target.value)} disabled={!canManage} />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium text-[var(--color-body)]" htmlFor="organisation-primary-contact-email">Primary contact email</label>
                <Input id="organisation-primary-contact-email" value={primaryContactEmail} onChange={(event) => setPrimaryContactEmail(event.target.value)} disabled={!canManage} />
              </div>
            </div>
            {!canManage ? <p className="text-sm text-[var(--color-muted-foreground)]">Only organisation owners and admins can edit organisation details.</p> : null}
          </div>
        </AccountsSection>

        <AccountsSection title="Status">
          <dl className="grid gap-4">
            <AccountsField label="Status" value={<Badge variant={organisation?.status === 'active' ? 'success' : 'warning'}>{organisation?.status ?? '-'}</Badge>} />
            <AccountsField label="Your role" value={<Badge variant="neutral">{organisation?.role ?? '-'}</Badge>} />
            <AccountsField label="Owner" value={organisation?.ownerFullName ?? organisation?.ownerEmail ?? '-'} />
            <AccountsField label="Owner email" value={organisation?.ownerEmail ?? '-'} />
          </dl>
        </AccountsSection>

        <AccountsSection title="Ownership transfer" description={canTransfer ? 'Transfer ownership to another current organisation member.' : 'Only the current owner can transfer ownership.'}>
          <div className="flex flex-col gap-3 md:flex-row">
            <select
              className="h-9 rounded-[var(--radius-md)] border border-[var(--color-border)] bg-transparent px-3 text-sm"
              value={newOwnerUserId}
              onChange={(event) => setNewOwnerUserId(event.target.value)}
              disabled={!canTransfer || savingKey === 'transfer'}
            >
              <option value="">Select member</option>
              {members
                .filter((member) => member.userId !== organisation?.ownerUserId)
                .map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.fullName ?? member.email ?? member.userId}
                  </option>
                ))}
            </select>
            <Button onClick={() => void handleTransfer()} disabled={!canTransfer || !newOwnerUserId || savingKey === 'transfer'}>
              {savingKey === 'transfer' ? 'Transferring...' : 'Transfer'}
            </Button>
          </div>
        </AccountsSection>
      </div>
    </AccountsPageShell>
  )
}
