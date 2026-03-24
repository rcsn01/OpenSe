import { useMemo } from 'react'
import { EmptyState } from '../EmptyState'
import { formatCurrency } from '../../utils'
import { useProductSuppliers } from '../../hooks/queries/useProductDetailTabs'

export const ProductSuppliersTab = ({ productId, companyId }: { productId: string; companyId: string }) => {
  const { data: suppliers = [], isLoading } = useProductSuppliers(companyId, productId)

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((left, right) => new Date(right.last_po_date).getTime() - new Date(left.last_po_date).getTime()),
    [suppliers],
  )

  if (isLoading) return <div className="empty-state">Loading supplier data...</div>

  return (
    <div className="stack">
      <div className="card">
        <div className="flex-between">
          <h3 className="section-title">Linked Vendors</h3>
          <button className="button secondary small">Link New Vendor</button>
        </div>
        <p className="muted small">Suppliers who have provided this product based on purchase history.</p>

        {sortedSuppliers.length === 0 ? (
          <EmptyState title="No suppliers found" description="Create a Purchase Order to link suppliers." />
        ) : (
          <div className="table-wrap" style={{ marginTop: 12 }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Vendor Name</th>
                  <th>Vendor SKU</th>
                  <th style={{ textAlign: 'right' }}>Last Cost</th>
                  <th style={{ textAlign: 'right' }}>Total Purchased</th>
                  <th>Last Order</th>
                </tr>
              </thead>
              <tbody>
                {sortedSuppliers.map((supplier) => (
                  <tr key={supplier.supplier_id}>
                    <td style={{ fontWeight: 'var(--type-weight-semibold)' }}>{supplier.supplier_name}</td>
                    <td className="muted small">Same as SKU</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(supplier.last_unit_cost)}</td>
                    <td style={{ textAlign: 'right' }}>{supplier.total_quantity}</td>
                    <td className="small muted">{new Date(supplier.last_po_date).toLocaleDateString()}</td>
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

