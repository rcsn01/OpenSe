import { useEffect, useState, type ReactNode } from 'react'
import { SearchX, ScanBarcode } from 'lucide-react'
import { StackLayout } from '@repo/ui'
import {
  useQuickScanLookup,
  useQuickScanTransaction,
  useQuickScanUser,
} from '../../hooks/queries/useQuickScan'

export const QuickScanTab = ({
  scanValue,
  setScanValue,
  companyId,
  entryMethod,
  cameraContent,
}: {
  scanValue: string
  setScanValue: (value: string) => void
  companyId: string
  entryMethod: 'camera' | 'manual'
  cameraContent?: ReactNode
}) => {
  const [quantity, setQuantity] = useState(1)
  const [message, setMessage] = useState<string | null>(null)
  const { data: userId } = useQuickScanUser()
  const lookupQuery = useQuickScanLookup(companyId, scanValue)
  const transactionMutation = useQuickScanTransaction()

  const product = lookupQuery.data?.product ?? null
  const notFoundSku = lookupQuery.data?.notFoundSku ?? null
  const lastHandledBy = lookupQuery.data?.lastHandledBy ?? '—'

  useEffect(() => {
    if (!scanValue) {
      setMessage(null)
    }
  }, [scanValue])

  const submitTransaction = async (transactionType: 'scan_in' | 'scan_out') => {
    if (!companyId || !product || !userId) return
    setMessage(null)

    try {
      await transactionMutation.mutateAsync({
        companyId,
        productId: product.id,
        userId,
        transactionType,
        quantity,
        barcode: scanValue,
        entryMethod,
      })
      setMessage(transactionType === 'scan_in' ? 'Stock added successfully.' : 'Stock removed successfully.')
      await lookupQuery.refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transaction failed.')
    }
  }

  return (
    <StackLayout>
      <div className="card stack">
        {!scanValue ? (
          <>
            <h2 className="section-title">Scan</h2>
            {cameraContent ?? (
              <div className="empty-state">
                <ScanBarcode size={28} />
                <div>Scan a barcode/QR to start lookup.</div>
              </div>
            )}

            <h3 className="section-title" style={{ marginTop: 8 }}>Manual Entry</h3>
            <label className="stack">
              Barcode / SKU / Product Name
              <input
                className="input"
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                placeholder="Type barcode, SKU, or product name"
              />
            </label>
            <div className="small muted">Entry mode: {entryMethod === 'camera' ? 'Camera' : 'Manual'}</div>
          </>
        ) : (
          <>
            <h2 className="section-title">Scan Lookup</h2>

            {lookupQuery.isLoading && <div className="small muted">Looking up product...</div>}

            {!product && notFoundSku && !lookupQuery.isLoading && (
              <div className="empty-state">
                <SearchX size={24} />
                <div>No product found for: <strong>{notFoundSku}</strong></div>
              </div>
            )}

            {product && (
              <div className="stack">
                <div className="flex-between">
                  <div>
                    <div style={{ fontWeight: 700 }}>{product.name}</div>
                    <div className="small muted">SKU: {product.sku}</div>
                  </div>
                  <span className="pill">On hand: {product.quantity_on_hand}</span>
                </div>

                <div className="small muted">Last handled by {lastHandledBy}</div>

                <label className="stack">
                  Quantity
                  <input
                    className="input"
                    type="number"
                    min={1}
                    value={quantity}
                    onChange={(event) => setQuantity(Number(event.target.value || 1))}
                  />
                </label>

                <div className="row">
                  <button
                    className="button"
                    disabled={transactionMutation.isPending}
                    onClick={() => submitTransaction('scan_in')}
                  >
                    Add Stock
                  </button>
                  <button
                    className="button secondary"
                    disabled={transactionMutation.isPending}
                    onClick={() => submitTransaction('scan_out')}
                  >
                    Remove Stock
                  </button>
                </div>
              </div>
            )}

            <h3 className="section-title" style={{ marginTop: 8 }}>Search Again</h3>
            <label className="stack">
              Barcode / SKU / Product Name
              <input
                className="input"
                value={scanValue}
                onChange={(event) => setScanValue(event.target.value)}
                placeholder="Type barcode, SKU, or product name"
              />
            </label>
            <div className="small muted">Entry mode: {entryMethod === 'camera' ? 'Camera' : 'Manual'}</div>
          </>
        )}

        {message && <div className="pill success">{message}</div>}
      </div>
    </StackLayout>
  )
}
