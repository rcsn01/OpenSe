import { useState } from 'react'
import { formatDateTime } from '../../utils'

export const ActivityLogsTab = () => {
  const [logs] = useState([
    { id: '1', user: 'Admin User', action: 'Changed Permissions', details: 'Updated "Manager" role permissions', date: new Date().toISOString() },
    { id: '2', user: 'Admin User', action: 'Data Export', details: 'Exported Inventory Valuation Report', date: new Date(Date.now() - 1000 * 60 * 30).toISOString() },
    { id: '3', user: 'Jane Doe', action: 'Login', details: 'Successful login from 192.168.1.42', date: new Date(Date.now() - 1000 * 60 * 60 * 2).toISOString() },
    { id: '4', user: 'Admin User', action: 'Invited Member', details: 'Invited new.user@example.com as Viewer', date: new Date(Date.now() - 1000 * 60 * 60 * 24).toISOString() },
    { id: '5', user: 'System', action: 'Backup', details: 'Automated daily backup completed', date: new Date(Date.now() - 1000 * 60 * 60 * 26).toISOString() },
  ])

  return (
    <div className="card stack" style={{ padding: 0, overflow: 'hidden' }}>
      <div style={{ padding: '20px 20px 12px', borderBottom: '1px solid var(--border)' }}>
        <div className="flex-between">
          <h3 className="section-title" style={{ margin: 0 }}>Activity Logs</h3>
          <button className="button ghost small">Export Logs</button>
        </div>
        <p className="muted small" style={{ margin: '4px 0 0' }}>
          Global feed of system access, permission changes, and administrative actions.
        </p>
      </div>
      <div className="table-wrap">
        <table className="table">
          <thead>
            <tr>
              <th>Timestamp</th>
              <th>User</th>
              <th>Action</th>
              <th>Details</th>
            </tr>
          </thead>
          <tbody>
            {logs.map((log) => (
              <tr key={log.id}>
                <td className="small muted" style={{ whiteSpace: 'nowrap' }}>
                  {formatDateTime(log.date)}
                </td>
                <td style={{ fontWeight: 500 }}>{log.user}</td>
                <td>
                  <span className={`pill ${log.action === 'Login' ? 'success' : 'neutral'}`}>
                    {log.action}
                  </span>
                </td>
                <td className="small">{log.details}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
