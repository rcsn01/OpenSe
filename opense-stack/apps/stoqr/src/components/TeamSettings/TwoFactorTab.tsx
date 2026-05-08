import { useMemo } from 'react'
import { Card, DataTable } from '@repo/ui'
import { useTwoFactorStatus } from '../../hooks/queries/useTeamSettings'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'

export const TwoFactorTab = ({ searchTerm = '' }: { searchTerm?: string }) => {
  const { data, isLoading, error } = useTwoFactorStatus()
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)
  const filteredFactors = useMemo(
    () => fuzzySearchItems(data?.factors ?? [], normalizedSearchTerm, [
      {
        key: (factor) => factor.friendly_name ?? factor.id,
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (factor) => factor.status,
        maxRanking: fuzzyRankings.CONTAINS,
      },
      {
        key: (factor) => factor.factor_type,
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]),
    [data?.factors, normalizedSearchTerm],
  )

  return (
    <div className="flex flex-col gap-4">
      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--color-muted-foreground)]">Current Auth Level</h3>
          <div className="text-3xl font-bold text-[var(--color-foreground)]">{data?.currentLevel?.toUpperCase() ?? '—'}</div>
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--color-muted-foreground)]">Next Required Level</h3>
          <div className="text-3xl font-bold text-[var(--color-foreground)]">{data?.nextLevel?.toUpperCase() ?? '—'}</div>
        </Card>
        <Card className="flex flex-col gap-2">
          <h3 className="text-sm font-medium text-[var(--color-muted-foreground)]">Verified Factors</h3>
          <div className="text-3xl font-bold text-[var(--color-foreground)]">{data?.hasVerifiedFactor ? 'Enabled' : 'Not Enabled'}</div>
        </Card>
      </div>

      <Card className="flex flex-col gap-4">
        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">Two-Factor Authentication</h3>
        {isLoading ? (
          <div className="empty-state">Loading 2FA status...</div>
        ) : error ? (
          <div className="empty-state">Unable to read MFA status for this user session.</div>
        ) : data && filteredFactors.length > 0 ? (
          <DataTable
            columns={[
              {
                id: 'factor',
                header: 'Factor',
                renderCell: (factor) => factor.friendly_name ?? factor.id,
              },
              {
                id: 'status',
                header: 'Status',
                renderCell: (factor) => factor.status,
              },
              {
                id: 'type',
                header: 'Type',
                renderCell: (factor) => factor.factor_type,
              },
            ]}
            rows={filteredFactors}
            getRowId={(factor) => factor.id}
          />
        ) : normalizedSearchTerm.length > 0 ? (
          <div className="empty-state">No enrolled 2FA factors match this search.</div>
        ) : (
          <div className="empty-state">No enrolled 2FA factors. Configure MFA from your account security flow.</div>
        )}

        <div className="text-sm text-[var(--color-muted-foreground)]">
          Team-level enforcement can be layered via role policy and sign-in requirements once org-wide MFA enforcement is available.
        </div>
      </Card>
    </div>
  )
}
