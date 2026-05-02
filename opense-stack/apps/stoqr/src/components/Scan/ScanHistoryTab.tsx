import { useMemo } from 'react'
import { DataTable } from '@repo/ui'
import { useScanHistory } from '../../hooks/queries/useQuickScan'
import { fuzzyRankings, fuzzySearchItems, normalizePageSearchTerm } from '../../lib/pageSearch'

export const ScanHistoryTab = ({ companyId, searchTerm = '' }: { companyId: string; searchTerm?: string }) => {
  const { data = [], isLoading } = useScanHistory(companyId)
  const normalizedSearchTerm = normalizePageSearchTerm(searchTerm)
  const filteredData = useMemo(
    () => fuzzySearchItems(data, normalizedSearchTerm, [
      {
        key: (event) => event.product?.name ?? '',
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (event) => event.product?.sku ?? event.barcode ?? '',
        maxRanking: fuzzyRankings.STARTS_WITH,
      },
      {
        key: (event) => [event.scan_type, event.entry_method, event.actorName],
        maxRanking: fuzzyRankings.CONTAINS,
      },
    ]),
    [data, normalizedSearchTerm],
  )

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
        <div className="small muted" style={{ marginTop: 4 }}>
          Showing {filteredData.length} of {data.length} events
        </div>
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
        rows={filteredData}
        getRowId={(event) => event.id}
        emptyState={normalizedSearchTerm.length > 0 ? `No scan history matched "${normalizedSearchTerm}".` : 'No scan history yet.'}
        tableWrapClassName="border-0 rounded-none"
      />
    </div>
  )
}
