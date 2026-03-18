import { useState, useMemo } from 'react'
import { Upload, Download, TrendingUp, Package, ArrowUpDown } from 'lucide-react'
import type { InventoryProduct } from './types'
import { useBulkUpdateInventoryProducts } from '../../hooks/queries/useInventory'

type Props = {
  companyId: string | null
  products: InventoryProduct[]
  onImportOpen: () => void
  onRefresh: () => void
}

const toCsv = (rows: string[][]) =>
  rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\n')

const downloadCsv = (fileName: string, content: string) => {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = fileName
  anchor.click()
  URL.revokeObjectURL(url)
}

const fmt = (n: number) => n.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })

export const BulkActionsTab = ({ companyId, products, onImportOpen, onRefresh }: Props) => {
  const bulkUpdateMutation = useBulkUpdateInventoryProducts(companyId)
  const [pricePct, setPricePct] = useState(0)
  const [quantityDelta, setQuantityDelta] = useState(0)
  const [message, setMessage] = useState<{ text: string; tone: 'success' | 'error' } | null>(null)

  const productIds = products.map((p) => p.id)

  const stats = useMemo(() => {
    let totalValue = 0
    let totalUnits = 0
    let priceSum = 0
    let priced = 0
    for (const p of products) {
      totalUnits += p.quantity_on_hand
      if (p.selling_price) {
        totalValue += p.selling_price * p.quantity_on_hand
        priceSum += p.selling_price
        priced++
      }
    }
    return {
      count: products.length,
      totalValue,
      totalUnits,
      avgPrice: priced > 0 ? priceSum / priced : 0,
    }
  }, [products])

  const exportCsv = () => {
    const rows = [
      ['Name', 'SKU', 'Quantity', 'Reorder Point', 'Cost Price', 'Selling Price'],
      ...products.map((p) => [
        p.name,
        p.sku,
        String(p.quantity_on_hand),
        String(p.reorder_point),
        String(p.cost_price ?? 0),
        String(p.selling_price ?? 0),
      ]),
    ]
    downloadCsv('inventory-export.csv', toCsv(rows))
  }

  const applyPriceAdjustment = async () => {
    if (productIds.length === 0) {
      setMessage({ text: 'No products in scope to update.', tone: 'error' })
      return
    }
    try {
      setMessage(null)
      const updated = await bulkUpdateMutation.mutateAsync({
        productIds,
        priceMultiplier: 1 + pricePct / 100,
      })
      setMessage({ text: `Price updated across ${updated} product${updated !== 1 ? 's' : ''}.`, tone: 'success' })
      setPricePct(0)
      onRefresh()
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Failed to update pricing.', tone: 'error' })
    }
  }

  const applyQuantityAdjustment = async () => {
    if (productIds.length === 0) {
      setMessage({ text: 'No products in scope to update.', tone: 'error' })
      return
    }
    try {
      setMessage(null)
      const updated = await bulkUpdateMutation.mutateAsync({ productIds, quantityDelta })
      setMessage({ text: `Quantity adjusted for ${updated} product${updated !== 1 ? 's' : ''}.`, tone: 'success' })
      setQuantityDelta(0)
      onRefresh()
    } catch (error) {
      setMessage({ text: error instanceof Error ? error.message : 'Failed to update quantity.', tone: 'error' })
    }
  }

  const priceHint = useMemo(() => {
    if (pricePct === 0 || stats.count === 0) return null
    const n = products.filter((p) => p.selling_price != null).length
    const dir = pricePct > 0 ? 'increase' : 'decrease'
    return `${n} product${n !== 1 ? 's' : ''} will ${dir} by ${Math.abs(pricePct)}%`
  }, [pricePct, products, stats.count])

  const qtyHint = useMemo(() => {
    if (quantityDelta === 0 || stats.count === 0) return null
    const dir = quantityDelta > 0 ? 'added to' : 'removed from'
    return `${Math.abs(quantityDelta)} unit${Math.abs(quantityDelta) !== 1 ? 's' : ''} ${dir} ${stats.count} product${stats.count !== 1 ? 's' : ''}`
  }, [quantityDelta, stats.count])

  return (
    <div className="stack" style={{ gap: 20 }}>
      {/* Scope overview */}
      <div className="inventory-summary">
        <div className="inventory-stat">
          <div className="inventory-stat-label">Products in Scope</div>
          <div className="inventory-stat-value">{stats.count}</div>
        </div>
        <div className="inventory-stat">
          <div className="inventory-stat-label">Inventory Value</div>
          <div className="inventory-stat-value">{fmt(stats.totalValue)}</div>
        </div>
        <div className="inventory-stat">
          <div className="inventory-stat-label">Avg. Unit Price</div>
          <div className="inventory-stat-value">{fmt(stats.avgPrice)}</div>
        </div>
        <div className="inventory-stat">
          <div className="inventory-stat-label">Total Units</div>
          <div className="inventory-stat-value">{stats.totalUnits.toLocaleString()}</div>
        </div>
      </div>

      {/* Data operations */}
      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-info-bar">
          <span style={{ fontWeight: 600 }}>Data Operations</span>
        </div>
        <div className="bulk-ops-row">
          <div className="bulk-ops-icon" style={{ background: 'rgba(102, 193, 63, 0.1)', color: 'var(--primary)' }}>
            <Upload size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Import from CSV</div>
            <div className="small muted">Create or update products in bulk from a spreadsheet</div>
          </div>
          <button className="button small" style={{ borderRadius: 8, flexShrink: 0 }} onClick={onImportOpen}>
            Import
          </button>
        </div>
        <div className="bulk-ops-row">
          <div className="bulk-ops-icon" style={{ background: 'rgba(2, 132, 199, 0.1)', color: 'var(--color-info, #0284c7)' }}>
            <Download size={18} />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontWeight: 600, fontSize: 14 }}>Export to CSV</div>
            <div className="small muted">
              Download {stats.count > 0 ? `all ${stats.count} products` : 'inventory data'} as a CSV file
            </div>
          </div>
          <button className="button small secondary" style={{ borderRadius: 8, flexShrink: 0 }} onClick={exportCsv}>
            Export
          </button>
        </div>
      </div>

      {/* Bulk adjustments */}
      <div className="grid grid-2">
        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-info-bar">
            <div className="row" style={{ gap: 6 }}>
              <TrendingUp size={14} />
              <span style={{ fontWeight: 600 }}>Price Adjustment</span>
            </div>
          </div>
          <div className="stack" style={{ padding: 20, gap: 16 }}>
            <label className="stack" style={{ gap: 6 }}>
              <span className="small" style={{ fontWeight: 500 }}>Percentage change</span>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  value={pricePct}
                  onChange={(e) => setPricePct(Number(e.target.value) || 0)}
                  style={{ borderRadius: 8 }}
                  placeholder="0"
                />
                <span className="muted" style={{ fontSize: 14, flexShrink: 0 }}>%</span>
              </div>
              <span className="small muted">Positive values increase, negative values decrease.</span>
            </label>

            {priceHint && (
              <div className="bulk-preview">
                <ArrowUpDown size={13} />
                <span>{priceHint}</span>
              </div>
            )}

            <button
              className="button small"
              style={{ alignSelf: 'flex-start', borderRadius: 8 }}
              onClick={applyPriceAdjustment}
              disabled={bulkUpdateMutation.isPending || pricePct === 0}
            >
              {bulkUpdateMutation.isPending ? 'Applying\u2026' : 'Apply Price Update'}
            </button>
          </div>
        </div>

        <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
          <div className="table-info-bar">
            <div className="row" style={{ gap: 6 }}>
              <Package size={14} />
              <span style={{ fontWeight: 600 }}>Quantity Adjustment</span>
            </div>
          </div>
          <div className="stack" style={{ padding: 20, gap: 16 }}>
            <label className="stack" style={{ gap: 6 }}>
              <span className="small" style={{ fontWeight: 500 }}>Units to add or remove</span>
              <div className="row" style={{ gap: 8 }}>
                <input
                  className="input"
                  type="number"
                  value={quantityDelta}
                  onChange={(e) => setQuantityDelta(Number(e.target.value) || 0)}
                  style={{ borderRadius: 8 }}
                  placeholder="0"
                />
                <span className="muted" style={{ fontSize: 14, flexShrink: 0 }}>units</span>
              </div>
              <span className="small muted">Positive values add stock, negative values subtract.</span>
            </label>

            {qtyHint && (
              <div className="bulk-preview">
                <ArrowUpDown size={13} />
                <span>{qtyHint}</span>
              </div>
            )}

            <button
              className="button small"
              style={{ alignSelf: 'flex-start', borderRadius: 8 }}
              onClick={applyQuantityAdjustment}
              disabled={bulkUpdateMutation.isPending || quantityDelta === 0}
            >
              {bulkUpdateMutation.isPending ? 'Applying\u2026' : 'Apply Quantity Update'}
            </button>
          </div>
        </div>
      </div>

      {message && (
        <div
          className={`badge ${message.tone === 'success' ? 'success' : 'danger'}`}
          style={{ alignSelf: 'flex-start' }}
        >
          {message.text}
        </div>
      )}
    </div>
  )
}
