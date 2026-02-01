import { formatDateTime } from '../../utils'

export const AuditTrailTab = ({ transactions }: { transactions: any[] }) => {
  return (
    <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Transaction Log</h3>
        <div className="small muted">Read-only audit log of all inventory changes.</div>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Item</th>
              <th style={{ textAlign: 'right' }}>Change</th>
              <th>IP Address</th>
              <th>User Agent</th>
            </tr>
          </thead>
          <tbody>
            {transactions.map((t) => {
              const p = Array.isArray(t.products) ? t.products[0] : t.products
              const u = Array.isArray(t.profiles) ? t.profiles[0] : t.profiles
              return (
                <tr key={t.id}>
                  <td className="small muted">{formatDateTime(t.created_at)}</td>
                  <td style={{ fontWeight: 500 }}>{u?.full_name || u?.username || 'System'}</td>
                  <td>
                    <span className="pill">{t.transaction_type}</span>
                  </td>
                  <td>
                    <div>{p?.name}</div>
                    <div className="small muted">{p?.sku}</div>
                  </td>
                  <td style={{ textAlign: 'right', fontWeight: 600, color: t.quantity_change > 0 ? 'var(--success)' : 'var(--text)' }}>
                    {t.quantity_change > 0 ? '+' : ''}{t.quantity_change}
                  </td>
                  <td className="small muted">192.168.x.x</td>
                  <td className="small muted" style={{ maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    Mozilla/5.0...
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}
