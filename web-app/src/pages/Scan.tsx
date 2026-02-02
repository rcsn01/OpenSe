import { useCallback, useEffect, useRef, useState } from 'react'
import { useCompany } from '../contexts/CompanyContext'
import { Tabs } from '../components/Tabs'
import { CycleCountTab } from '../components/Scan/CycleCountTab'
import { PickPackTab } from '../components/Scan/PickPackTab'
import { PutawayTab } from '../components/Scan/PutawayTab'
import { QuickScanTab } from '../components/Scan/QuickScanTab'

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
          return (
            <div className="stack">
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
                      <button className="button" onClick={startCamera} disabled={!scanSupported}>Start Camera</button>
                    )}
                  </div>
                </div>
                {!scanSupported && (
                  <div className="muted small">Barcode scanning is not supported in this browser.</div>
                )}
                <div className="grid" style={{ gridTemplateColumns: '1fr 240px', gap: 16 }}>
                  <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                    <video ref={videoRef} style={{ width: '100%', height: 240, background: '#0f172a' }} muted playsInline />
                  </div>
                  <div className="card stack" style={{ boxShadow: 'none', background: '#f8fafc' }}>
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

              <Tabs
                tabs={[
                  { id: 'quick', label: 'Quick Scan', content: <QuickScanTab scanValue={scanValue} companyId={companyId} /> },
                  { id: 'pick', label: 'Pick & Pack', content: <PickPackTab scanValue={scanValue} /> },
                  { id: 'cycle', label: 'Cycle Count', content: <CycleCountTab scanValue={scanValue} /> },
                  { id: 'putaway', label: 'Putaway', content: <PutawayTab scanValue={scanValue} /> },
                ]}
              />
            </div>
          )
        }
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