import { useTwoFactorStatus } from '../../hooks/queries/useTeamSettings'

export const TwoFactorTab = () => {
  const { data, isLoading, error } = useTwoFactorStatus()

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
        ) : data && data.factors.length > 0 ? (
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Factor</th>
                  <th>Status</th>
                  <th>Type</th>
                </tr>
              </thead>
              <tbody>
                {data.factors.map((factor) => (
                  <tr key={factor.id}>
                    <td>{factor.friendly_name ?? factor.id}</td>
                    <td>{factor.status}</td>
                    <td>{factor.factor_type}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
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
