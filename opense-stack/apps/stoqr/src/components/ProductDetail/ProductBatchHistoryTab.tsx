import { DataTable } from '@repo/ui'
import { EmptyState } from '../EmptyState'
import { formatDateTime } from '../../utils'
import { useProductBatchHistory } from '../../hooks/queries/useProductDetailTabs'

export const ProductBatchHistoryTab = ({ productId, companyId }: { productId: string; companyId: string }) => {
  const { data: batches = [], isLoading } = useProductBatchHistory(companyId, productId)

  return (
    <div className="stack">
      <div className="card stack">
        <h3 className="section-title">Traceability</h3>
        <p className="muted small">Track which customers received inventory batches.</p>
        {isLoading ? (
          <div className="empty-state">Loading history...</div>
        ) : batches.length === 0 ? (
          <EmptyState title="No distribution history" description="Sales transactions will appear here for traceability." />
        ) : (
          <DataTable
            columns={[
              {
                id: 'date',
                header: 'Date',
                renderCell: (batch) => <span className="small muted">{formatDateTime(batch.created_at)}</span>,
              },
              {
                id: 'batch',
                header: 'Batch / Serial #',
                renderCell: (batch) => (
                  <span className="small">
                    {batch.notes && batch.notes.length > 5 ? batch.notes : `BATCH-${new Date(batch.created_at).getTime().toString().slice(-6)}`}
                  </span>
                ),
              },
              {
                id: 'customer',
                header: 'Customer',
                renderCell: (batch) => batch.profiles?.full_name ?? 'Unknown / Retail Sale',
              },
              {
                id: 'quantity',
                header: 'Quantity',
                renderCell: (batch) => <span className="badge">{Math.abs(batch.quantity_change)}</span>,
              },
            ]}
            rows={batches}
            getRowId={(batch, index) => `${batch.created_at}-${index}`}
          />
        )}
      </div>
    </div>
  )
}
