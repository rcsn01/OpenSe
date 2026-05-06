import { useMemo } from 'react'
import { DataTable } from '@repo/ui'
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
    <div className="stack">
      <div className="grid grid-3">
        <div className="card stat">
          <h3>Current Auth Level</h3>
          <div className="value">{data?.currentLevel?.toUpperCase() ?? '—'}</div>
        </div>
        <div className="card stat">
          <h3>Next Required Level</h3>
          <div className="value">{data?.nextLevel?.toUpperCase() ?? '—'}</div>
        </div>
        <div className="card stat">
          <h3>Verified Factors</h3>
          <div className="value">{data?.hasVerifiedFactor ? 'Enabled' : 'Not Enabled'}</div>
        </div>
      </div>

      <div className="card stack">
        <h3 className="section-title">Two-Factor Authentication</h3>
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

        <div className="small muted">
          Team-level enforcement can be layered via role policy and sign-in requirements once org-wide MFA enforcement is available.
        </div>
      </div>
    </div>
  )
}
