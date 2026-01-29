import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../supabaseClient'
import { useCompany } from '../contexts/CompanyContext'
import { EmptyState } from '../components/EmptyState'
import { Tabs } from '../components/Tabs'
import type { Product } from '../types'

// --- Helpers ---

const detectBarcode = async (
  detector: any,
  video: HTMLVideoElement,
  onResult: (value: string) => void,
) => {
  try {
    const barcodes = await detector.detect(video)
    if (barcodes.length > 0 && barcodes[0].rawValue) {
      onResult(barcodes[0].rawValue)
    }
  } catch (err) {
    console.warn('Barcode detection failed:', err)
  }
}

// --- Tab Views ---

const QuickScanView = ({ 
  scanValue, 
  companyId 
}: { 
  scanValue: string
  companyId: string 
}) => {
  const navigate = useNavigate()
  const [product, setProduct] = useState<Product | null>(null)
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
      const { data, error } = await supabase
        .from('products')
        .select('id, name, sku, quantity_on_hand, reorder_point, description')
        .eq('company_id', companyId)
        .or(`sku.eq.${value},id.eq.${value}`)
        .limit(1)
        .maybeSingle()

      if (error) {
        console.error(error)
        setProduct(null)
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
    if (scanValue) lookupProduct(scanValue)
  }, [scanValue, lookupProduct])

  const submitTransaction = async (transactionType: 'purchase' | 'return' | 'sale' | 'loss') => {
    if (!companyId || !product || !userId) return
    setMessage(null)

    // Ensure we handle quantity sign correctly for the backend trigger
    // Sale/Loss should be positive here, the backend trigger handles negation if needed, 
    // BUT the current trigger logic expects positive for Purchase/Return and negative for Sale/Loss logic?
    // Checking triggers: The trigger says: 
    // "if new.transaction_type in ('sale', 'loss') then qty_delta := -abs(new.quantity_change);"
    // So we can send positive numbers safely.
    
    const { error } = await supabase.from('inventory_transactions').insert({
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
    <div className="grid grid-2">
      <div className="card stack">
        <h3 className="section-title">Item details</h3>
        {!product ? (
          <EmptyState title="No item selected" description="Scan a barcode to load product info." />
        ) : (
          <>
            <div className="flex-between">
              <div>
                <div style={{ fontWeight: 600 }}>{product.name}</div>
                <div className="small muted">SKU {product.sku}</div>
              </div>
              <button className="button ghost" onClick={() => navigate(`/inventory/${product.id}`)}>
                Open
              </button>
            </div>
            <div className="row wrap">
              <span className="pill">On hand: {product.quantity_on_hand}</span>
              <span className="pill">Reorder: {product.reorder_point}</span>
            </div>
            <div className="small muted">Last handled by {lastHandledBy}</div>
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
               <select className="select" value={checkInType} onChange={(e) => setCheckInType(e.target.value as any)}>
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
               <select className="select" value={checkOutType} onChange={(e) => setCheckOutType(e.target.value as any)}>
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
        {message && <div className="muted small">{message}</div>}
      </div>
    </div>
  )
}

const PickPackView = ({ scanValue }: { scanValue: string }) => {
  // Mock State
  const [order] = useState({ id: 'SO-1001', customer: 'Acme Corp', items: [
    { id: '1', name: 'Widget A', sku: 'WID-A', qty: 5, picked: 0 },
    { id: '2', name: 'Gadget B', sku: 'GAD-B', qty: 2, picked: 0 }
  ]})
  const [items, setItems] = useState(order.items)

  useEffect(() => {
    if (scanValue) {
       // Simulate scanning an item
       setItems(prev => prev.map(item => {
         // Naive match
         if (item.sku === scanValue || item.id === scanValue || scanValue.includes(item.sku)) {
           return { ...item, picked: Math.min(item.qty, item.picked + 1) }
         }
         return item
       }))
    }
  }, [scanValue])

  const progress = items.reduce((acc, i) => acc + (i.picked / i.qty), 0) / items.length * 100

  return (
    <div className="grid grid-2">
       <div className="card stack">
          <div className="flex-between">
             <h3 className="section-title">Order {order.id}</h3>
             <span className="badge warning">Pending</span>
          </div>
          <div className="small muted">Customer: {order.customer}</div>
          <div style={{ height: 4, background: '#eee', width: '100%', borderRadius: 2 }}>
             <div style={{ height: '100%', background: 'var(--success)', width: `${progress}%`, transition: 'width 0.3s' }} />
          </div>
          <div className="list">
             {items.map(item => (
               <div key={item.id} className="flex-between" style={{ opacity: item.picked >= item.qty ? 0.5 : 1 }}>
                  <div>
                    <div style={{fontWeight: 600}}>{item.name}</div>
                    <div className="small muted">SKU: {item.sku}</div>
                  </div>
                  <div className="row">
                     <span className="pill">{item.picked} / {item.qty}</span>
                     {item.picked >= item.qty && <span className="badge success">Done</span>}
                  </div>
               </div>
             ))}
          </div>
          {progress === 100 && <button className="button">Complete Order</button>}
       </div>
       <div className="card stack">
          <h3 className="section-title">Instructions</h3>
          <p className="muted">Scan items to verify the pick list. Once all items are scanned, you can complete the order.</p>
          <div className="small muted">Last scan: {scanValue || 'None'}</div>
          
          <div className="card" style={{ boxShadow: 'none', background: '#f8fafc', marginTop: 'auto' }}>
            <h4 style={{ margin: '0 0 8px' }}>Active Order</h4>
            <select className="select" disabled>
              <option>SO-1001 (Acme Corp)</option>
            </select>
          </div>
       </div>
    </div>
  )
}

const CycleCountView = ({ scanValue }: { scanValue: string }) => {
  const [mode, setMode] = useState<'scan_item' | 'enter_qty'>('scan_item')
  const [activeItem, setActiveItem] = useState<{sku: string} | null>(null)
  const [count, setCount] = useState('')

  useEffect(() => {
    if (scanValue && mode === 'scan_item') {
      setActiveItem({ sku: scanValue })
      setMode('enter_qty')
    }
  }, [scanValue, mode])

  const handleSave = () => {
    alert(`Recorded count ${count} for ${activeItem?.sku}. In a real app, this would log a discrepancy report.`)
    setMode('scan_item')
    setActiveItem(null)
    setCount('')
  }

  return (
    <div className="grid grid-2">
       <div className="card stack">
          <h3 className="section-title">Blind Count: Zone A</h3>
          {mode === 'scan_item' ? (
             <div className="empty-state">
                <p>Scan an item on the shelf.</p>
                <div className="muted small">System will not show expected quantity to ensure accuracy.</div>
             </div>
          ) : (
             <div className="stack">
                <div className="flex-between">
                   <h4 style={{margin:0}}>Item: {activeItem?.sku}</h4>
                   <button className="button ghost small" onClick={() => setMode('scan_item')}>Cancel</button>
                </div>
                <label className="stack">
                   Enter Counted Quantity
                   <input className="input" type="number" value={count} onChange={e => setCount(e.target.value)} autoFocus />
                </label>
                <button className="button" onClick={handleSave}>Submit Count</button>
             </div>
          )}
       </div>
       <div className="card">
          <h3 className="section-title">Session Progress</h3>
          <div className="list">
             <div className="flex-between small"><span className="muted">Items counted</span><span>0</span></div>
             <div className="flex-between small"><span className="muted">Discrepancies</span><span>0</span></div>
          </div>
       </div>
    </div>
  )
}

const PutawayView = ({ scanValue }: { scanValue: string }) => {
   const [scannedItem, setScannedItem] = useState<string | null>(null)

   useEffect(() => {
     if (scanValue) setScannedItem(scanValue)
   }, [scanValue])

   return (
     <div className="grid grid-2">
        <div className="card stack">
           <h3 className="section-title">Receiving & Putaway</h3>
           {!scannedItem ? (
             <div className="empty-state">Scan a received item to get a location suggestion.</div>
           ) : (
             <div className="stack">
                <div className="card" style={{ background: '#f0f9ff', borderColor: '#bae6fd', boxShadow: 'none' }}>
                   <div className="small muted">Scanned Item</div>
                   <div style={{fontSize: 18, fontWeight: 600}}>{scannedItem}</div>
                </div>
                <div className="card" style={{ background: '#f0fdf4', borderColor: '#bbf7d0', textAlign: 'center', padding: 32, boxShadow: 'none' }}>
                   <div className="muted" style={{ marginBottom: 8 }}>Suggested Location</div>
                   <div style={{fontSize: 32, fontWeight: 700, color: '#15803d'}}>Shelf B-04</div>
                   <div className="small muted">Zone 2 &middot; Aisle 1</div>
                </div>
                <button className="button" onClick={() => setScannedItem(null)}>Confirm Putaway</button>
             </div>
           )}
        </div>
        <div className="card">
           <h3 className="section-title">Incoming Shipments</h3>
           <div className="list">
              <div className="flex-between">
                 <div>PO-9921</div>
                 <span className="badge success">Arrived</span>
              </div>
              <div className="flex-between">
                 <div>PO-9924</div>
                 <span className="badge warning">In Transit</span>
              </div>
              <div className="flex-between">
                 <div>PO-9925</div>
                 <span className="badge">Ordered</span>
              </div>
           </div>
        </div>
     </div>
   )
}

// --- Main Component ---

export const Scan = () => {
  const { companyId } = useCompany()
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const [scanValue, setScanValue] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [scanSupported, setScanSupported] = useState(false)

  useEffect(() => {
    setScanSupported('BarcodeDetector' in window)
  }, [])

  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    setIsScanning(false)
  }, [])

  const startCamera = useCallback(async () => {
    if (!videoRef.current || !scanSupported) return
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
      streamRef.current = stream
      videoRef.current.srcObject = stream
      await videoRef.current.play()
      setIsScanning(true)

      const BarcodeDetectorCtor = (window as any).BarcodeDetector
      const detector = new BarcodeDetectorCtor({ formats: ['code_128', 'ean_13', 'qr_code', 'ean_8'] })
      
      let rafId = 0
      const tick = async () => {
        if (!videoRef.current || !isScanning) return
        try {
          await detectBarcode(detector, videoRef.current, (value) => {
            setScanValue(value)
            // Optional: visual feedback beep
          })
        } catch (error) {
          console.error(error)
        }
        rafId = requestAnimationFrame(tick)
      }
      rafId = requestAnimationFrame(tick)

      return () => cancelAnimationFrame(rafId)
    } catch (e) {
      console.error("Camera failed", e)
      alert("Unable to access camera.")
    }
  }, [scanSupported, isScanning])

  useEffect(() => {
    if (scanSupported && isScanning) {
      startCamera()
    }
    return () => stopCamera()
  }, [scanSupported, isScanning, startCamera, stopCamera])

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to access scanner operations." />
  }

  return (
    <div className="stack">
      {/* Scanner Header */}
      <div className="card stack">
        <div className="flex-between">
          <div>
            <h3 className="section-title">Scanner Operations</h3>
            <div className="muted small">Active code: {scanValue || 'Ready to scan'}</div>
          </div>
          {scanSupported && (
            <button 
              className={`button ${isScanning ? 'secondary' : ''}`} 
              onClick={() => setIsScanning((prev) => !prev)} 
              type="button"
            >
              {isScanning ? 'Stop camera' : 'Start camera'}
            </button>
          )}
        </div>
        
        {isScanning ? (
          <div className="card" style={{ padding: 0, overflow: 'hidden', borderRadius: 20, background: '#000' }}>
            <video ref={videoRef} style={{ width: '100%', height: 280, objectFit: 'cover' }} />
          </div>
        ) : (
           // Fallback for manual entry when camera is off
           <label className="stack">
            Manual Entry
            <input
              className="input"
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Type SKU or Barcode and hit Enter"
            />
          </label>
        )}
      </div>

      {/* Operations Tabs */}
      <Tabs
        tabs={[
          {
            id: 'quick',
            label: 'Quick Scan',
            content: <QuickScanView scanValue={scanValue} companyId={companyId} />
          },
          {
            id: 'pick',
            label: 'Pick & Pack',
            content: <PickPackView scanValue={scanValue} />
          },
          {
            id: 'count',
            label: 'Cycle Counts',
            content: <CycleCountView scanValue={scanValue} />
          },
          {
            id: 'putaway',
            label: 'Putaway',
            content: <PutawayView scanValue={scanValue} />
          }
        ]}
      />
    </div>
  )
}