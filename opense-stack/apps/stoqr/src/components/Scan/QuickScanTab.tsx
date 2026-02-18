import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StackLayout } from '@repo/ui'
import { EmptyState } from '../EmptyState'
import { SearchX, PackagePlus, Camera, StopCircle, ScanBarcode, Keyboard, X } from 'lucide-react'
import {
  useQuickScanLookup,
  useQuickScanTransaction,
  useQuickScanUser,
} from '../../hooks/queries/useQuickScan'

export const QuickScanTab = ({ scanValue, companyId }: { scanValue: string; companyId: string }) => {
  const navigate = useNavigate()
  const [quantity, setQuantity] = useState(1)
  const [checkInType, setCheckInType] = useState<'purchase' | 'return'>('purchase')
  const [checkOutType, setCheckOutType] = useState<'sale' | 'loss'>('sale')
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

  const submitTransaction = async (transactionType: 'purchase' | 'return' | 'sale' | 'loss') => {
    if (!companyId || !product || !userId) return
    setMessage(null)

    try {
      await transactionMutation.mutateAsync({
        companyId,
        productId: product.id,
        userId,
        transactionType,
        quantity,
      })
      setMessage('Transaction recorded.')
      await lookupQuery.refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transaction failed.')
    }
  }

  return (
    <StackLayout variant="grid-2">
      <div className="card stack">
        <h3 className="section-title">Item details</h3>
        
        {/* State 1: Nothing Scanned */}
        {!product && !notFoundSku && (
          <EmptyState title="No item selected" description="Scan a barcode to load product info." />
        )}

        {/* State 2: Scanned but Not Found */}
        {!product && notFoundSku && (
          <div className="empty-state">
            <div style={{ 
              width: 48, height: 48, borderRadius: 24, background: '#fee2e2', 
              color: '#ef4444', display: 'grid', placeItems: 'center', marginBottom: 12 
            }}>
              <SearchX size={24} />
            </div>
            <h3 style={{ margin: '0 0 4px' }}>Product Not Found</h3>
            <p className="muted small" style={{ margin: 0 }}>
              No item found with SKU: <strong>{notFoundSku}</strong>
            </p>
            <button 
              className="button secondary small" 
              style={{ marginTop: 16 }}
              onClick={() => navigate('/inventory/new')}
            >
              <PackagePlus size={16} style={{ marginRight: 8 }} />
              Create this Product
            </button>
          </div>
        )}

        {/* State 3: Product Found */}
        {product && (
          <>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 600, fontSize: 18 }}>{product.name}</div>
                <div className="small muted">SKU: {product.sku}</div>
              </div>
              <button className="button ghost" onClick={() => navigate(`/inventory/${product.id}`)}>
                Open
              </button>
            </div>
            <div className="row wrap" style={{ marginTop: 12 }}>
              <span className="pill" style={{ fontSize: 14, padding: '4px 12px' }}>
                On hand: <strong>{product.quantity_on_hand}</strong>
              </span>
              <span className="pill" style={{ fontSize: 14, padding: '4px 12px' }}>
                Reorder: <strong>{product.reorder_point}</strong>
              </span>
            </div>
            <div className="small muted" style={{ marginTop: 12 }}>
              Last handled by {lastHandledBy}
            </div>
          </>
        )}
      </div>

      <div className="card stack">
        <h3 className="section-title">Quick actions</h3>
        <label className="stack">
          Quantity
          <input
            className="input"
            type="number"
            min={1}
            value={quantity}
            onChange={(event) => setQuantity(Number(event.target.value))}
          />
        </label>
        <div className="grid grid-2">
          <div className="stack">
            <div className="small muted">Check-in</div>
            <div className="row">
              <select className="select" value={checkInType} onChange={(e) => setCheckInType(e.target.value as 'purchase' | 'return')}>
                <option value="purchase">Buy</option>
                <option value="return">Return</option>
              </select>
              <button
                className="button"
                disabled={!product}
                onClick={() => submitTransaction(checkInType)}
              >
                Go
              </button>
            </div>
          </div>
          <div className="stack">
            <div className="small muted">Check-out</div>
            <div className="row">
              <select className="select" value={checkOutType} onChange={(e) => setCheckOutType(e.target.value as 'sale' | 'loss')}>
                <option value="sale">Sale</option>
                <option value="loss">Loss</option>
              </select>
              <button
                className="button"
                disabled={!product}
                onClick={() => submitTransaction(checkOutType)}
              >
                Go
              </button>
            </div>
          </div>
        </div>
        {message && (
          <div className="pill success" style={{ justifyContent: 'center', marginTop: 8 }}>
            {message}
          </div>
        )}
      </div>
    </StackLayout>
  )
}

// Exported Scanner Module Component
export const ScannerModule = ({
  scanValue,
  setScanValue,
  isScanning,
  startCamera,
  stopCamera,
}: {
  scanValue: string
  setScanValue: (value: string) => void
  isScanning: boolean
  startCamera: () => Promise<void>
  stopCamera: () => Promise<void>
}) => {
  return (
    <div className="stack">
      {/* Camera Viewport */}
      <div
        className="card"
        style={{
          padding: 0,
          overflow: 'hidden',
          position: 'relative',
          background: '#000',
          borderRadius: 16,
          aspectRatio: '4/3',
          width: '100%',
          boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
        }}
      >
        <div id="reader" style={{ width: '100%', height: '100%' }} />

        {/* Overlay: Not Scanning */}
        {!isScanning && (
          <div
            style={{
              position: 'absolute',
              inset: 0,
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              background: 'linear-gradient(180deg, #f8fafc 0%, #e2e8f0 100%)',
              color: 'var(--muted)',
              zIndex: 10,
            }}
          >
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: 32,
                background: 'white',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                marginBottom: 16,
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
              }}
            >
              <ScanBarcode size={32} className="text-blue-500" />
            </div>
            <h3 style={{ margin: '0 0 4px', color: 'var(--text)', fontSize: 18 }}>Tap to Scan</h3>
            <p className="small muted" style={{ margin: '0 0 24px' }}>
              Ready to capture barcode
            </p>
            <button
              className="button"
              onClick={startCamera}
              style={{ padding: '12px 32px', borderRadius: 99, fontWeight: 600 }}
            >
              <Camera size={20} style={{ marginRight: 8 }} />
              Start Camera
            </button>
          </div>
        )}

        {/* Overlay: Scanning Controls */}
        {isScanning && (
          <div
            style={{
              position: 'absolute',
              bottom: 20,
              left: 0,
              right: 0,
              display: 'flex',
              justifyContent: 'center',
              gap: 16,
              zIndex: 20,
            }}
          >
            <button
              onClick={stopCamera}
              className="button"
              style={{
                background: 'rgba(15, 23, 42, 0.8)',
                color: 'white',
                border: '1px solid rgba(255,255,255,0.2)',
                backdropFilter: 'blur(8px)',
                padding: '10px 24px',
                borderRadius: 30,
              }}
            >
              <StopCircle size={18} style={{ marginRight: 8 }} /> Stop
            </button>
          </div>
        )}
      </div>

      {/* Manual Input */}
      <div className="card" style={{ padding: '8px 12px', display: 'flex', alignItems: 'center', gap: 12, borderRadius: 12 }}>
        <Keyboard size={20} className="text-slate-400" />
        <input
          className="input"
          style={{
            border: 'none',
            padding: '8px 0',
            flex: 1,
            boxShadow: 'none',
            fontSize: 16,
            background: 'transparent',
          }}
          value={scanValue}
          onChange={(event) => setScanValue(event.target.value)}
          placeholder="Or type barcode..."
        />
        {scanValue && (
          <button
            className="button ghost icon-button small"
            onClick={() => setScanValue('')}
            style={{ borderRadius: '50%', width: 32, height: 32, padding: 0 }}
          >
            <X size={16} />
          </button>
        )}
      </div>
    </div>
  )
}