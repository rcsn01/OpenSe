import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useCompany } from '../contexts/CompanyContext'
import { Tabs } from '../components/Tabs'
import { CycleCountTab } from '../components/Scan/CycleCountTab'
import { PickPackTab } from '../components/Scan/PickPackTab'
import { PutawayTab } from '../components/Scan/PutawayTab'
import { QuickScanTab } from '../components/Scan/QuickScanTab'
import { toast } from 'sonner'

export const Scan = () => {
  const { companyId } = useCompany()
  const [scanValue, setScanValue] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const scannerRef = useRef<Html5Qrcode | null>(null)

  // Cleanup scanner on unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current && scannerRef.current.isScanning) {
        scannerRef.current.stop().catch((err) => console.error('Failed to stop scanner', err))
      }
    }
  }, [])

  const stopCamera = useCallback(async () => {
    if (scannerRef.current && scannerRef.current.isScanning) {
      try {
        await scannerRef.current.stop()
        setIsScanning(false)
        // Clear the reference to allow re-initialization if needed
        scannerRef.current.clear()
        scannerRef.current = null
      } catch (err) {
        console.error('Failed to stop scanner', err)
      }
    } else {
        setIsScanning(false)
    }
  }, [])

  const startCamera = useCallback(async () => {
    // Prevent multiple instances
    if (scannerRef.current?.isScanning) return

    try {
      // Initialize the scanner
      const scanner = new Html5Qrcode("reader")
      scannerRef.current = scanner

      const config = {
        fps: 10,
        qrbox: { width: 250, height: 250 },
        aspectRatio: 1.0,
        formatsToSupport: [
            Html5QrcodeSupportedFormats.QR_CODE,
            Html5QrcodeSupportedFormats.CODE_128,
            Html5QrcodeSupportedFormats.EAN_13,
            Html5QrcodeSupportedFormats.EAN_8
        ]
      }

      await scanner.start(
        { facingMode: "environment" },
        config,
        (decodedText) => {
          // Success callback
          if (decodedText !== scanValue) {
            setScanValue(decodedText)
            toast.success(`Scanned: ${decodedText}`)
            // Optional: Auto-stop after scan?
            // stopCamera() 
          }
        },
        () => {
          // Error callback (called frequently when no code is found, usually ignore)
        }
      )
      
      setIsScanning(true)
    } catch (error: any) {
      console.error("Camera start failed", error)
      toast.error(`Camera error: ${error.message || 'Could not start camera'}`)
      setIsScanning(false)
    }
  }, [scanValue])

  const ScannerInterface = (
    <div className="card stack">
      <div className="flex-between">
        <div>
          <h3 className="section-title">Scanner</h3>
          <div className="muted small">Use your camera or manually enter a barcode.</div>
        </div>
        <div className="row">
          {isScanning ? (
            <button className="button ghost" onClick={stopCamera}>Stop Camera</button>
          ) : (
            <button className="button" onClick={startCamera}>Start Camera</button>
          )}
        </div>
      </div>

      <div className="grid" style={{ gridTemplateColumns: '1fr 240px', gap: 16 }}>
        {/* Camera Viewport */}
        <div className="card" style={{ padding: 0, overflow: 'hidden', background: '#000', minHeight: 300, position: 'relative' }}>
          
          {/* Placeholder when not scanning */}
          {!isScanning && (
            <div style={{ 
              position: 'absolute', inset: 0, 
              display: 'flex', alignItems: 'center', justifyContent: 'center', 
              color: 'white', opacity: 0.5, zIndex: 1 
            }}>
              Camera Off
            </div>
          )}

          {/* HTML5-QRCode Target Element */}
          <div id="reader" style={{ width: '100%', height: '100%' }} />
          
        </div>

        {/* Manual Entry */}
        <div className="card stack" style={{ boxShadow: 'none', background: '#f8fafc', height: 'fit-content' }}>
          <label className="stack">
            Manual entry
            <input
              className="input"
              value={scanValue}
              onChange={(event) => setScanValue(event.target.value)}
              placeholder="Scan or type barcode"
            />
          </label>
          <button className="button secondary" onClick={() => setScanValue('')}>Clear</button>
          <div className="small muted">Last scan: {scanValue || '—'}</div>
        </div>
      </div>
    </div>
  )

  return (
    <div className="stack">
      <Tabs
        tabs={[
          { 
            id: 'quick', 
            label: 'Quick Scan', 
            content: (
              <div className="stack">
                {ScannerInterface}
                <QuickScanTab scanValue={scanValue} companyId={companyId || ''} />
              </div>
            )
          },
          { id: 'pick', label: 'Pick & Pack', content: (
              <div className="stack">
                {ScannerInterface}
                <PickPackTab scanValue={scanValue} /> 
              </div>
            )
          },
          { id: 'cycle', label: 'Cycle Count', content: (
              <div className="stack">
                {ScannerInterface}
                <CycleCountTab scanValue={scanValue} />
              </div>
            ) 
          },
          { id: 'putaway', label: 'Putaway', content: (
              <div className="stack">
                {ScannerInterface}
                <PutawayTab scanValue={scanValue} />
              </div>
            ) 
          },
        ]}
      />
    </div>
  )
}