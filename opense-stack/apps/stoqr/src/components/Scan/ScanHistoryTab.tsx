import { DataTable } from '@repo/ui'
import { useScanHistory } from '../../hooks/queries/useQuickScan'

export const ScanHistoryTab = ({ companyId }: { companyId: string }) => {
  const { data = [], isLoading } = useScanHistory(companyId)

  if (isLoading) {
    return <div className="empty-state">Loading scan history...</div>
  }

  if (!data.length) {
    return <div className="empty-state">No scan history yet.</div>
  }

  return (
    <div className="card stack" style={{ overflow: 'hidden', padding: 0 }}>
      <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--border)' }}>
        <h3 className="section-title" style={{ margin: 0 }}>Scan History Log</h3>
        <div className="small muted">Recent scanner events across manual and camera modes.</div>
      </div>
      <DataTable
        columns={[
          {
            id: 'timestamp',
            header: 'Timestamp',
            renderCell: (event) => <span className="small muted">{new Date(event.created_at).toLocaleString()}</span>,
          },
          {
            id: 'type',
            header: 'Type',
            renderCell: (event) => <span className="pill">{event.scan_type.replace('_', ' ')}</span>,
          },
          {
            id: 'item',
            header: 'Item',
            renderCell: (event) => (
              <div>
                <div>{event.product?.name ?? 'Unknown item'}</div>
                <div className="small muted">{event.product?.sku ?? event.barcode ?? '—'}</div>
              </div>
            ),
          },
          {
            id: 'qty',
            header: 'Qty',
            align: 'right',
            renderCell: (event) => (
              <span style={{ fontWeight: 'var(--type-weight-semibold)' }}>{event.quantity ?? 0}</span>
            ),
          },
          {
            id: 'method',
            header: 'Method',
            renderCell: (event) => <span className="small muted">{event.entry_method}</span>,
          },
          {
            id: 'user',
            header: 'User',
            renderCell: (event) => <span className="small muted">{event.actorName}</span>,
          },
        ]}
        rows={data}
        getRowId={(event) => event.id}
        tableWrapClassName="border-0 rounded-none"
      />
    </div>
  )
}
