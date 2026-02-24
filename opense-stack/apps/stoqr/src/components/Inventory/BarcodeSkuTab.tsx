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
    <div className="grid" style={{ gridTemplateColumns: '360px 1fr', gap: 24 }}>
      <div className="card stack">
        <h3 className="section-title">Barcode / SKU Management</h3>
        <label className="stack">
          Product
          <select className="select" value={productId} onChange={(event) => setProductId(event.target.value)}>
            <option value="">Select product...</option>
            {products.map((product) => (
              <option key={product.id} value={product.id}>{product.name} ({product.sku})</option>
            ))}
          </select>
        </label>
        <label className="stack">
          Barcode / QR Value
          <input className="input" value={barcode} onChange={(event) => setBarcode(event.target.value)} placeholder="e.g. 0123456789012" />
        </label>
        <label className="stack">
          Barcode Type
          <select className="select" value={barcodeType} onChange={(event) => setBarcodeType(event.target.value as 'barcode' | 'qr')}>
            <option value="barcode">Barcode</option>
            <option value="qr">QR</option>
          </select>
        </label>
        <label className="row" style={{ alignItems: 'center', gap: 8 }}>
          <input type="checkbox" checked={isPrimary} onChange={(event) => setIsPrimary(event.target.checked)} />
          Set as primary barcode
        </label>
        <button className="button" onClick={saveBarcode} disabled={upsertBarcodeMutation.isPending}>Save Barcode</button>
        {message && <div className="small muted">{message}</div>}
      </div>

      <div className="card stack">
        <div className="flex-between">
          <h3 className="section-title">Existing Barcodes</h3>
          <span className="pill">{barcodes.length}</span>
        </div>
        {isLoading ? (
          <div className="empty-state">Loading barcodes...</div>
        ) : barcodes.length === 0 ? (
          <div className="empty-state">No barcodes configured.</div>
        ) : (
          <div className="table-wrap">
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
                    <td>{row.products?.name ?? 'Unknown'}</td>
                    <td className="small muted">{row.products?.sku ?? '—'}</td>
                    <td>{row.barcode}</td>
                    <td>{row.barcode_type}</td>
                    <td>{row.is_primary ? 'Yes' : 'No'}</td>
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
