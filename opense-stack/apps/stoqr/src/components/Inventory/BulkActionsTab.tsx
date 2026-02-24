import { useState } from 'react'
import type { InventoryProduct } from './types'
import { useBulkUpdateInventoryProducts } from '../../hooks/queries/useInventory'

type Props = {
  companyId: string | null
  products: InventoryProduct[]
  onImportOpen: () => void
  onRefresh: () => void
}

const toCsv = (rows: string[][]) => rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')

const downloadCsv = (fileName: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

export const BulkActionsTab = ({ companyId, products, onImportOpen, onRefresh }: Props) => {
  const bulkUpdateMutation = useBulkUpdateInventoryProducts(companyId)
  const [pricePct, setPricePct] = useState(0)
  const [quantityDelta, setQuantityDelta] = useState(0)
  const [message, setMessage] = useState<string | null>(null)

  const productIds = products.map((product) => product.id)

  const exportCsv = () => {
    const rows = [
      ['Name', 'SKU', 'Quantity', 'Reorder Point', 'Cost Price', 'Selling Price', 'Category'],
      ...products.map((product) => [
        product.name,
        product.sku,
        String(product.quantity_on_hand),
        String(product.reorder_point),
        String(product.cost_price ?? 0),
        String(product.selling_price ?? 0),
        product.category ?? '',
      ]),
    ]

    downloadCsv('inventory-export.csv', toCsv(rows))
  }

  const applyPriceAdjustment = async () => {
    if (productIds.length === 0) {
      setMessage('No products to update on this page.')
      return
    }

    try {
      setMessage(null)
      const multiplier = 1 + pricePct / 100
      const updated = await bulkUpdateMutation.mutateAsync({ productIds, priceMultiplier: multiplier })
      setMessage(`Updated pricing for ${updated} products.`)
      onRefresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to bulk update pricing.')
    }
  }

  const applyQuantityAdjustment = async () => {
    if (productIds.length === 0) {
      setMessage('No products to update on this page.')
      return
    }

    try {
      setMessage(null)
      const updated = await bulkUpdateMutation.mutateAsync({ productIds, quantityDelta })
      setMessage(`Adjusted quantity for ${updated} products.`)
      onRefresh()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to bulk update quantity.')
    }
  }

  return (
    <div className="stack">
      <div className="grid grid-3">
        <div className="card stat">
          <h3>Import</h3>
          <div className="small muted">Bulk actions include import, export, and bulk updates.</div>
          <button className="button" style={{ marginTop: 12 }} onClick={onImportOpen}>Import CSV</button>
        </div>
        <div className="card stat">
          <h3>Export</h3>
          <div className="small muted">Export current inventory table rows to CSV.</div>
          <button className="button" style={{ marginTop: 12 }} onClick={exportCsv}>Export CSV</button>
        </div>
        <div className="card stat">
          <h3>Rows in Scope</h3>
          <div className="value">{products.length}</div>
          <div className="small muted">Uses currently loaded products list.</div>
        </div>
      </div>

      <div className="grid grid-2">
        <div className="card stack">
          <h3 className="section-title">Bulk Price Update</h3>
          <label className="stack">
            Percentage Adjustment
            <input className="input" type="number" value={pricePct} onChange={(event) => setPricePct(Number(event.target.value) || 0)} />
          </label>
          <div className="small muted">Example: `10` increases by 10%, `-5` reduces by 5%.</div>
          <button className="button" onClick={applyPriceAdjustment} disabled={bulkUpdateMutation.isPending}>Apply Price Update</button>
        </div>

        <div className="card stack">
          <h3 className="section-title">Bulk Quantity Update</h3>
          <label className="stack">
            Quantity Delta
            <input className="input" type="number" value={quantityDelta} onChange={(event) => setQuantityDelta(Number(event.target.value) || 0)} />
          </label>
          <div className="small muted">Adds or subtracts this amount from each product quantity.</div>
          <button className="button" onClick={applyQuantityAdjustment} disabled={bulkUpdateMutation.isPending}>Apply Quantity Update</button>
        </div>
      </div>

      {message && <div className="pill">{message}</div>}
    </div>
  )
}
