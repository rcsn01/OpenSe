import { useState } from 'react'
import type { InventoryProduct } from './types'
import { useInventoryReferenceData, useUpsertInventoryBarcode } from '../../hooks/queries/useInventory'

type Props = {
  companyId: string | null
  products: InventoryProduct[]
}

export const BarcodeSkuTab = ({ companyId, products }: Props) => {
  const { data, isLoading } = useInventoryReferenceData(companyId)
  const upsertBarcodeMutation = useUpsertInventoryBarcode(companyId)

  const [productId, setProductId] = useState('')
  const [barcode, setBarcode] = useState('')
  const [barcodeType, setBarcodeType] = useState<'barcode' | 'qr'>('barcode')
  const [isPrimary, setIsPrimary] = useState(true)
  const [message, setMessage] = useState<string | null>(null)

  const barcodes = data?.barcodes ?? []

  const saveBarcode = async () => {
    if (!productId || !barcode.trim()) return

    try {
      setMessage(null)
      await upsertBarcodeMutation.mutateAsync({
        productId,
        barcode: barcode.trim(),
        barcodeType,
        isPrimary,
      })
      setBarcode('')
      setMessage('Barcode saved.')
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Failed to save barcode.')
    }
  }

  return (
    <div className="grid" style={{ gridTemplateColumns: '340px 1fr', gap: 16 }}>
      <div className="card stack" style={{ gap: 12 }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 600 }}>Add Barcode</h3>
        <label className="stack" style={{ gap: 4 }}>
          <span className="small muted">Product</span>
          <select className="select" style={{ borderRadius: 8 }} value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Select product...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
            ))}
          </select>
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="small muted">Barcode / QR Value</span>
          <input className="input" style={{ borderRadius: 8 }} value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="e.g. 0123456789012" />
        </label>
        <label className="stack" style={{ gap: 4 }}>
          <span className="small muted">Barcode Type</span>
          <select className="select" style={{ borderRadius: 8 }} value={barcodeType} onChange={(event) => setBarcodeType(event.target.value as 'barcode' | 'qr')}>
            <option value="barcode">Barcode</option>
            <option value="qr">QR Code</option>
          </select>
        </label>
        <label className="row" style={{ alignItems: 'center', gap: 8, fontSize: 13 }}>
          <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
          Set as primary barcode
        </label>
        <button className="button small" style={{ alignSelf: 'flex-start', borderRadius: 8 }} onClick={saveBarcode} disabled={upsertBarcodeMutation.isPending}>Save Barcode</button>
        {message && <div className="small muted" style={{ color: 'var(--success)' }}>{message}</div>}
      </div>

      <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
        <div className="table-info-bar">
          <span style={{ fontWeight: 600 }}>Barcodes</span>
          <span className="pill">{barcodes.length}</span>
        </div>
        {isLoading ? (
          <div className="empty-state" style={{ padding: 48 }}>Loading barcodes...</div>
        ) : barcodes.length === 0 ? (
          <div className="empty-state" style={{ padding: 48 }}>No barcodes configured yet.</div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table className="table">
              <thead>
                <tr>
                  <th>Product</th>
                  <th>SKU</th>
                  <th>Barcode</th>
                  <th>Type</th>
                  <th>Primary</th>
                </tr>
              </thead>
              <tbody>
                {barcodes.map((row) => (
                  <tr key={row.id}>
                    <td style={{ fontWeight: 500 }}>{row.products?.name ?? 'Unknown'}</td>
                    <td className="muted" style={{ fontSize: 13 }}>{row.products?.sku ?? '—'}</td>
                    <td style={{ fontFamily: 'monospace', fontSize: 13 }}>{row.barcode}</td>
                    <td style={{ textTransform: 'uppercase', fontSize: 12, fontWeight: 600, color: 'var(--muted)' }}>{row.barcode_type}</td>
                    <td>{row.is_primary ? '✓' : '—'}</td>
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
