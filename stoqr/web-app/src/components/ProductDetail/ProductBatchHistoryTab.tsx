import { useEffect, useState } from 'react'
import { supabase } from '../../supabaseClient'
import { EmptyState } from '../EmptyState'
import { formatDateTime } from '../../utils'

export const ProductBatchHistoryTab = ({ productId, companyId }: { productId: string; companyId: string }) => {
  const [batches, setBatches] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadBatches = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('inventory_transactions')
        .select(`
          created_at, quantity_change, notes,
          profiles (full_name)
        `)
        .eq('company_id', companyId)
        .eq('product_id', productId)
        .eq('transaction_type', 'sale')
        .order('created_at', { ascending: false })

      if (error) {
        console.error(error)
      } else {
        setBatches((data as any[]) ?? [])
      }
      setIsLoading(false)
    }
    loadBatches()
  }, [productId, companyId])

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
          <div className="table-wrap">
            <table className="table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Batch / Serial #</th>
                  <th>Customer</th>
                  <th>Quantity</th>
                </tr>
              </thead>
              <tbody>
                {batches.map((b, i) => (
                  <tr key={i}>
                    <td className="small muted">{formatDateTime(b.created_at)}</td>
                    <td className="small" style={{ fontFamily: 'monospace' }}>
                      {b.notes && b.notes.length > 5 ? b.notes : `BATCH-${new Date(b.created_at).getTime().toString().slice(-6)}`}
                    </td>
                    <td>{b.profiles?.full_name ?? 'Unknown / Retail Sale'}</td>
                    <td><span className="badge">{Math.abs(b.quantity_change)}</span></td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
