import { useCallback, useEffect, useRef, useState } from 'react'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { StackLayout } from '@repo/ui'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { CycleCountTab } from '../components/Scan/CycleCountTab'
import { PickPackTab } from '../components/Scan/PickPackTab'
import { PutawayTab } from '../components/Scan/PutawayTab'
import { QuickScanTab, ScannerModule } from '../components/Scan/QuickScanTab'
import { toast } from 'sonner'

export const ScanPage = () => {
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

  // Reusable Scanner UI Component - Fluid Width
  const ScannerModuleComponent = (
    <ScannerModule
      scanValue={scanValue}
      setScanValue={setScanValue}
      isScanning={isScanning}
      startCamera={startCamera}
      stopCamera={stopCamera}
    />
  )

  return (
    <BasePage companyId={companyId} isLoading={false}>
      <Tabs
        tabs={[
          { 
            id: 'quick', 
            label: 'Quick Scan', 
            content: (
              <StackLayout variant="grid-2" className="items-start">
                {/* Column 1: Scanner */}
                <div style={{ position: 'sticky', top: 24 }}>
                  {ScannerModuleComponent}
                </div>
                
                {/* Column 2: Results & Actions */}
                <div className="stack">
                  <QuickScanTab scanValue={scanValue} companyId={companyId || ''} />
                </div>
              </StackLayout>
            )
          },
          { 
            id: 'pick', 
            label: 'Pick & Pack', 
            content: (
              <StackLayout variant="grid-2" className="items-start">
                <div style={{ position: 'sticky', top: 24 }}>
                  {ScannerModuleComponent}
                </div>
                <div className="stack">
                  <PickPackTab scanValue={scanValue} /> 
                </div>
              </StackLayout>
            )
          },
          { 
            id: 'cycle', 
            label: 'Cycle Count', 
            content: (
              <StackLayout variant="grid-2" className="items-start">
                <div style={{ position: 'sticky', top: 24 }}>
                  {ScannerModuleComponent}
                </div>
                <div className="stack">
                  <CycleCountTab scanValue={scanValue} />
                </div>
              </StackLayout>
            ) 
          },
          { 
            id: 'putaway', 
            label: 'Putaway', 
            content: (
              <StackLayout variant="grid-2" className="items-start">
                <div style={{ position: 'sticky', top: 24 }}>
                  {ScannerModuleComponent}
                </div>
                <div className="stack">
                  <PutawayTab scanValue={scanValue} />
                </div>
              </StackLayout>
            ) 
          },
        ]}
      />
    </BasePage>
  )
}