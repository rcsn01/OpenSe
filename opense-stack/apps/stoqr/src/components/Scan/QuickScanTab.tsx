import { useCallback, useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { StackLayout } from '@repo/ui'
import { supabase, db } from '../../supabaseClient'
import type { Product } from '../../types'
import { EmptyState } from '../EmptyState'
import { SearchX, PackagePlus, Camera, StopCircle, ScanBarcode, Keyboard, X } from 'lucide-react'
import { toast } from 'sonner'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'

export const QuickScanTab = ({ scanValue, companyId }: { scanValue: string; companyId: string }) => {
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
  const [notFoundSku, setNotFoundSku] = useState<string | null>(null)
  const [lastHandledBy, setLastHandledBy] = useState<string>('—')
  const [quantity, setQuantity] = useState(1)
  const [checkInType, setCheckInType] = useState<'purchase' | 'return'>('purchase')
  const [checkOutType, setCheckOutType] = useState<'sale' | 'loss'>('sale')
  const [message, setMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUserId(data.user?.id ?? null))
  }, [])

  const lookupProduct = useCallback(
    async (value: string) => {
      if (!companyId || !value) return
      
      const cleanValue = value.trim()
      setNotFoundSku(null) 

      // FIX: Added quotes around ${cleanValue} to support SKUs with spaces (e.g., "ITEM A")
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, reorder_point, description')
        .eq('company_id', companyId)
        .or(`sku.eq."${cleanValue}",id.eq."${cleanValue}"`)
        .maybeSingle()

      if (error || !data) {
        setProduct(null)
        setNotFoundSku(cleanValue)
        return
      }

      setProduct((data as Product) ?? null)

      if (data?.id) {
        const { data: transactionData } = await supabase
          .from('inventory_transactions')
          .select('created_at, profiles (full_name, username)')
          .eq('company_id', companyId)
          .eq('product_id', data.id)
          .order('created_at', { ascending: false })
          .limit(1)

        const profile = Array.isArray(transactionData?.[0]?.profiles)
          ? transactionData?.[0]?.profiles?.[0]
          : transactionData?.[0]?.profiles
        setLastHandledBy(profile?.full_name ?? profile?.username ?? 'Unknown')
      }
    },
    [companyId],
  )

  useEffect(() => {
    if (scanValue) {
      lookupProduct(scanValue)
    } else {
      setProduct(null)
      setNotFoundSku(null)
      setMessage(null)
    }
  }, [scanValue, lookupProduct])

  const submitTransaction = async (transactionType: 'purchase' | 'return' | 'sale' | 'loss') => {
    if (!companyId || !product || !userId) return
    setMessage(null)

    const { error } = await db.from('inventory_transactions').insert({
      company_id: companyId,
      product_id: product.id,
      performed_by: userId,
      transaction_type: transactionType,
      quantity_change: quantity,
      notes: 'Scanner quick action',
    })

    setMessage(error ? error.message : 'Transaction recorded.')
    if (!error) {
      lookupProduct(product.sku)
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
  scannerRef,
}: {
  scanValue: string
  setScanValue: (value: string) => void
  isScanning: boolean
  startCamera: () => Promise<void>
  stopCamera: () => Promise<void>
  scannerRef: React.MutableRefObject<Html5Qrcode | null>
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