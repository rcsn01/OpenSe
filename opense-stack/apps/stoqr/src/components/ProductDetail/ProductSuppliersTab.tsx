import { useMemo } from 'react'
import { EmptyState } from '../EmptyState'
import { formatCurrency } from '../../utils'
import { useProductSuppliers } from '../../hooks/queries/useProductDetailTabs'

const formatDateLabel = (value: string) => new Date(value).toISOString().slice(0, 10)

export const ProductSuppliersTab = ({
  productId,
  companyId,
  productSku,
}: {
  productId: string
  companyId: string
  productSku?: string
}) => {
  const { data: suppliers = [], isLoading } = useProductSuppliers(companyId, productId)

  const sortedSuppliers = useMemo(
    () => [...suppliers].sort((left, right) => new Date(right.last_po_date).getTime() - new Date(left.last_po_date).getTime()),
    [suppliers],
  )

  if (isLoading) return <div className="empty-state">Loading supplier data...</div>

  return (
    <section className="product-tab-shell" aria-label="Suppliers">
      {sortedSuppliers.length === 0 ? (
        <EmptyState title="No suppliers found" description="Create a purchase order to link suppliers to this product." />
      ) : (
        <div className="product-detail-table-shell">
          <table className="product-detail-table product-detail-table--suppliers">
            <thead>
              <tr>
                <th>Vendor Name</th>
                <th>Vendor SKU</th>
                <th>Last Cost</th>
                <th>Last Purchased</th>
                <th>Last Order</th>
              </tr>
            </thead>
            <tbody>
              {sortedSuppliers.map((supplier) => (
                <tr key={supplier.supplier_id}>
                  <td className="product-detail-table-strong">{supplier.supplier_name}</td>
                  <td>{productSku || '—'}</td>
                  <td>{formatCurrency(supplier.last_unit_cost)}</td>
                  <td>{supplier.last_order_quantity} units</td>
                  <td>{formatDateLabel(supplier.last_po_date)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

