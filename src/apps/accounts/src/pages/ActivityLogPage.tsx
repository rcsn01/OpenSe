import { useEffect, useState } from 'react'
import { Badge, Button, DataTable, type DataTableColumn } from '@repo/ui'
import { RefreshCw } from 'lucide-react'
import { AccountsAlert, AccountsPageShell } from '../components/AccountsPageShell'
import { listOrgAuditEvents, type OrgAuditEvent } from '../api/auditEvents'

const actionLabelMap: Record<string, string> = {
  seat_limit_updated: 'Seat limit updated',
  seat_assigned: 'Seat assigned',
  seat_unassigned: 'Seat unassigned',
  organisation_profile_updated: 'Organisation updated',
  billing_contact_updated: 'Billing contact updated',
  organisation_owner_transferred: 'Owner transferred',
  profile_updated: 'Profile updated',
  preferences_updated: 'Preferences updated',
  recovery_email_updated: 'Recovery email updated',
  account_exported: 'Account exported',
}

const getCategory = (action: string) => {
  if (action.includes('billing') || action.includes('seat_limit')) return 'Billing'
  if (action.includes('seat') || action.includes('invite')) return 'Seats'
  if (action.includes('profile')) return 'Profile'
  if (action.includes('recovery') || action.includes('security')) return 'Security'
  if (action.includes('preference')) return 'Preferences'
  if (action.includes('organisation') || action.includes('owner')) return 'Organisation'
  return 'Account'
}

export const ActivityLogPage = () => {
  const [loading, setLoading] = useState(true)
  const [events, setEvents] = useState<OrgAuditEvent[]>([])
  const [error, setError] = useState<string | null>(null)

  const loadEvents = async () => {
    try {
      setLoading(true)
      setError(null)
      setEvents(await listOrgAuditEvents(100))
    } catch (err: any) {
      setError(err?.message ?? 'Failed to load activity.')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadEvents()
  }, [])

  const columns: Array<DataTableColumn<OrgAuditEvent>> = [
    {
      id: 'action',
      header: 'Event',
      renderCell: (event) => (
        <div className="flex flex-col">
          <span className="font-medium text-[var(--color-heading)]">
            {actionLabelMap[event.action] ?? event.action}
            {event.appCode ? ` (${event.appCode.toUpperCase()})` : ''}
          </span>
          <span className="text-xs text-[var(--color-muted-foreground)]">{event.targetUserEmail ?? event.targetOrgMemberId ?? ''}</span>
        </div>
      ),
    },
    {
      id: 'category',
      header: 'Category',
      renderCell: (event) => <Badge variant="neutral">{getCategory(event.action)}</Badge>,
    },
    {
      id: 'actor',
      header: 'Actor',
      renderCell: (event) => event.actorFullName ?? event.actorEmail ?? 'System',
    },
    {
      id: 'created',
      header: 'Time',
      renderCell: (event) => new Date(event.createdAt).toLocaleString(),
    },
  ]

  return (
    <AccountsPageShell
      title="Activity Log"
      description="Audit history for invites, seats, billing, roles, profile, security, preferences, and organisation changes."
      loading={loading}
      loadingLabel="Loading activity..."
      alert={<AccountsAlert error={error} errorTitle="Activity load failed" />}
      actions={
        <Button variant="outline" size="sm" onClick={() => void loadEvents()} disabled={loading}>
          <RefreshCw className="h-4 w-4" />
          Refresh
        </Button>
      }
    >
      <DataTable
        variant="operational"
        rows={events}
        columns={columns}
        getRowId={(event) => event.id}
        emptyState="No account activity recorded."
        minTableWidth="52rem"
      />
    </AccountsPageShell>
  )
}
