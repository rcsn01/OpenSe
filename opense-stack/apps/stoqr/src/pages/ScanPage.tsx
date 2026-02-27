import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { QuickScanTab } from '../components/Scan/QuickScanTab'
import { ScanHistoryTab } from '../components/Scan/ScanHistoryTab'
import { toast } from 'sonner'

export const ScanPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['scan-actions', 'scan-history'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'scan-actions'
  const [scanValue, setScanValue] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [entryMethod, setEntryMethod] = useState<'camera' | 'manual'>('manual')
  const scannerRef = useRef<Html5Qrcode | null>(null)

  const handleManualScanValue = (value: string) => {
    if (value.trim()) {
      void stopCamera()
    }
    setEntryMethod('manual')
    setScanValue(value)
  }

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
    if (scannerRef.current?.isScanning) return

    try {
      const scanner = new Html5Qrcode("reader")
      scannerRef.current = scanner

      const config = {
        fps: 2,
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
          if (decodedText !== scanValue) {
            setScanValue(decodedText)
            setEntryMethod('camera')
            toast.success(`Scanned: ${decodedText}`)
            stopCamera()
          }
        },
        () => {}
      )
      
      setIsScanning(true)
    } catch (error: any) {
      console.error("Camera start failed", error)
      toast.error(`Camera error: ${error.message || 'Could not start camera'}`)
      setIsScanning(false)
    }
  }, [scanValue, stopCamera])

  return (
    <BasePage companyId={companyId} isLoading={false}>
      <Tabs
        activeTab={activeTab}
        onTabChange={(nextTab) => navigate(`/scan/${nextTab}`)}
        tabs={[
          { 
            id: 'scan-actions', 
            label: 'Scan', 
            content: (
              <QuickScanTab
                scanValue={scanValue}
                setScanValue={handleManualScanValue}
                companyId={companyId || ''}
                entryMethod={entryMethod}
                cameraContent={
                  <>
                    <div className="row wrap">
                      <button className="button" onClick={startCamera} disabled={isScanning}>
                        Start Camera
                      </button>
                      <button className="button secondary" onClick={stopCamera} disabled={!isScanning}>
                        Stop Camera
                      </button>
                    </div>
                    <div id="reader" style={{ width: '100%', minHeight: 220 }} />
                  </>
                }
              />
            )
          },
          {
            id: 'scan-history',
            label: 'History',
            content: <ScanHistoryTab companyId={companyId || ''} />,
          },
        ]}
      />
    </BasePage>
  )
}