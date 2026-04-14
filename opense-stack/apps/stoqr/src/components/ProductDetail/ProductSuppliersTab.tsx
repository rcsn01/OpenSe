import { useMemo } from 'react'
import { DataTable } from '@repo/ui'
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
          <div style={{ marginTop: 12 }}>
            <DataTable
              columns={[
                {
                  id: 'vendor-name',
                  header: 'Vendor Name',
                  renderCell: (supplier) => (
                    <span style={{ fontWeight: 'var(--type-weight-semibold)' }}>{supplier.supplier_name}</span>
                  ),
                },
                {
                  id: 'vendor-sku',
                  header: 'Vendor SKU',
                  renderCell: () => <span className="muted small">Same as SKU</span>,
                },
                {
                  id: 'last-cost',
                  header: 'Last Cost',
                  align: 'right',
                  renderCell: (supplier) => formatCurrency(supplier.last_unit_cost),
                },
                {
                  id: 'total-purchased',
                  header: 'Total Purchased',
                  align: 'right',
                  renderCell: (supplier) => supplier.total_quantity,
                },
                {
                  id: 'last-order',
                  header: 'Last Order',
                  renderCell: (supplier) => <span className="small muted">{new Date(supplier.last_po_date).toLocaleDateString()}</span>,
                },
              ]}
              rows={sortedSuppliers}
              getRowId={(supplier) => supplier.supplier_id}
            />
          </div>
        )}
      </div>
    </div>
  )
}

