import { useEffect, useState } from 'react'
import { supabase, db } from '../../supabaseClient'
import { EmptyState } from '../EmptyState'
import { formatCurrency } from '../../utils'

type SupplierSummary = {
  supplier_id: string
  supplier_name: string
  last_po_date: string
  last_unit_cost: number
  total_quantity: number
}

export const ProductSuppliersTab = ({ productId, companyId }: { productId: string; companyId: string }) => {
  const [suppliers, setSuppliers] = useState<SupplierSummary[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const loadSuppliers = async () => {
      setIsLoading(true)
      const { data, error } = await supabase
        .from('purchase_order_items')
        .select(`
          unit_cost, quantity_ordered,
          purchase_orders!inner(created_at, suppliers!inner(id, name))
        `)
        .eq('purchase_orders.company_id', companyId)
        .eq('product_id', productId)
        .order('created_at', { ascending: false, foreignTable: 'purchase_orders' })

      if (error) {
        console.error(error)
        setSuppliers([])
      } else {
        const raw = (data as any[]) ?? []
        const summaryMap: Record<string, SupplierSummary> = {}

        raw.forEach((item) => {
          const sId = item.purchase_orders.suppliers.id
          const sName = item.purchase_orders.suppliers.name
          const date = item.purchase_orders.created_at

          if (!summaryMap[sId]) {
            summaryMap[sId] = {
              supplier_id: sId,
              supplier_name: sName,
              last_po_date: date,
              last_unit_cost: item.unit_cost,
              total_quantity: 0,
            }
          }
          summaryMap[sId].total_quantity += item.quantity_ordered

          if (new Date(date) > new Date(summaryMap[sId].last_po_date)) {
            summaryMap[sId].last_po_date = date
            summaryMap[sId].last_unit_cost = item.unit_cost
          }
        })

        setSuppliers(Object.values(summaryMap))
      }
      setIsLoading(false)
    }

    loadSuppliers()
  }, [productId, companyId])

  if (isLoading) return <div className="empty-state">Loading supplier data...</div>

  return (
    <div className="stack">
      <div className="card">
        <div className="flex-between">
          <h3 className="section-title">Linked Vendors</h3>
          <button className="button secondary small">Link New Vendor</button>
        </div>
        <p className="muted small">Suppliers who have provided this product based on purchase history.</p>

        {suppliers.length === 0 ? (
          <EmptyState title="No suppliers found" description="Create a Purchase Order to link suppliers." />
        ) : (
          <div className="table-wrap">
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
                {suppliers.map((s) => (
                  <tr key={s.supplier_id}>
                    <td style={{ fontWeight: 600 }}>{s.supplier_name}</td>
                    <td className="muted small">Same as SKU</td>
                    <td style={{ textAlign: 'right' }}>{formatCurrency(s.last_unit_cost)}</td>
                    <td style={{ textAlign: 'right' }}>{s.total_quantity}</td>
                    <td className="small muted">{new Date(s.last_po_date).toLocaleDateString()}</td>
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
