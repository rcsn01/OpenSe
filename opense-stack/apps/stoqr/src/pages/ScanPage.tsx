import { useCallback, useEffect, useRef, useState } from 'react'
import { useNavigate, useOutletContext, useParams } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CameraOff, ScanBarcode } from 'lucide-react'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { Tabs } from '../components/Tabs'
import { QuickScanTab } from '../components/Scan/QuickScanTab'
import { ScanHistoryTab } from '../components/Scan/ScanHistoryTab'
import type { AppLayoutOutletContext } from '../layouts/AppLayout'
import { toast } from 'sonner'
import { useInventoryProducts } from '../hooks/queries/useInventory'
import { useScanHistory } from '../hooks/queries/useQuickScan'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { defaultInventoryUrlState } from './inventoryUrlState'
import { normalizePageSearchTerm } from '../lib/pageSearch'

export const ScanPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const layoutContext = useOutletContext<AppLayoutOutletContext | null>()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['scan-actions', 'scan-history'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'scan-actions'
  const topBarSearchValue = layoutContext?.topBarSearchValue ?? ''
  const debouncedSearchValue = useDebouncedValue(topBarSearchValue, 250)
  const scanHistorySearchTerm = activeTab === 'scan-history' ? topBarSearchValue : ''
  const [scanValue, setScanValue] = useState('')
  const [isScanning, setIsScanning] = useState(false)
  const [entryMethod, setEntryMethod] = useState<'camera' | 'manual'>('manual')
  const scannerRef = useRef<Html5Qrcode | null>(null)
  const productSuggestionsQuery = useInventoryProducts({
    companyId: activeTab === 'scan-actions' ? companyId : null,
    search: activeTab === 'scan-actions' ? debouncedSearchValue : '',
    stockFilter: defaultInventoryUrlState.stockFilter,
    page: defaultInventoryUrlState.page,
    pageSize: 8,
    sortField: defaultInventoryUrlState.sortField,
    sortDir: defaultInventoryUrlState.sortDir,
  })
  const scanHistoryQuery = useScanHistory(activeTab === 'scan-history' && companyId ? companyId : '')

  const handleManualScanValue = (value: string) => {
    if (value.trim()) {
      void stopCamera()
    }
    setEntryMethod('manual')
    setScanValue(value)
  }

  // Cleanup scanner on unmount
  useEffect(() => {
    if (activeTab !== 'scan-actions') {
      return
    }

    const normalizedSearchValue = normalizePageSearchTerm(topBarSearchValue)
    setScanValue(normalizedSearchValue)
    setEntryMethod('manual')
  }, [activeTab, topBarSearchValue])

  useEffect(() => {
    if (activeTab === 'scan-actions') {
      const suggestedProducts = (productSuggestionsQuery.data?.products ?? []).slice(0, 8).map((product) => ({
        id: `scan-product-${product.id}`,
        title: product.name,
        subtitle: `${product.sku} · ${product.quantity_on_hand} on hand`,
        value: product.sku || product.name,
        badge: 'Product',
      }))

      layoutContext?.setTopBarSearchConfig({
        suggestions: suggestedProducts,
        onSuggestionSelect: (suggestion) => {
          setScanValue(suggestion.value)
          setEntryMethod('manual')
        },
      })
      return
    }

    const historySuggestions = (scanHistoryQuery.data ?? []).slice(0, 8).map((event) => ({
      id: `scan-history-${event.id}`,
      title: event.product?.name ?? 'Unknown item',
      subtitle: `${event.product?.sku ?? event.barcode ?? '—'} · ${event.actorName}`,
      value: event.product?.sku ?? event.barcode ?? event.product?.name ?? '',
      badge: event.entry_method,
    }))

    layoutContext?.setTopBarSearchConfig({
      suggestions: historySuggestions,
    })
  }, [activeTab, layoutContext, productSuggestionsQuery.data?.products, scanHistoryQuery.data])

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

  const handleResetSearch = useCallback(() => {
    void stopCamera()
    setEntryMethod('manual')
    setScanValue('')
    layoutContext?.setTopBarSearchValue('')
  }, [layoutContext, stopCamera])

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
    <BasePage
      companyId={companyId}
      isLoading={false}
      contentStyle={{ display: 'flex', flexDirection: 'column', height: '100%', minHeight: 0, overflow: 'hidden' }}
      containerClassName="stack"
      containerStyle={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}
    >
      <Tabs
        activeTab={activeTab}
        onTabChange={(nextTab) => navigate(`/scan/${nextTab}`)}
        bottomSpacing
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
                onResetSearch={handleResetSearch}
                cameraContent={
                  <div className="flex h-full min-h-0 flex-1 flex-col gap-4">
                    <div className="relative min-h-[26rem] flex-1 overflow-hidden rounded-lg bg-[var(--color-muted)]">
                      <div
                        id="reader"
                        className="h-full w-full"
                      />
                      {!isScanning && (
                        <div className="absolute inset-0 flex flex-col items-center justify-center px-6 text-center text-[var(--color-muted-foreground)]">
                          <div className="mb-3 rounded-full bg-[var(--color-background)] p-3.5 shadow-sm">
                            <ScanBarcode size={24} className="text-[var(--color-primary)]" />
                          </div>
                          <p className="text-sm font-medium">Point your camera at a barcode</p>
                        </div>
                      )}
                    </div>
                    <button
                      className={`inline-flex w-full items-center justify-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold transition-colors ${
                        isScanning
                          ? 'border border-[var(--color-border)] text-[var(--color-destructive)] hover:bg-[var(--color-muted)]'
                          : 'bg-[var(--color-primary)] text-[var(--color-primary-foreground)] shadow-sm hover:opacity-90'
                      }`}
                      onClick={isScanning ? stopCamera : startCamera}
                    >
                      {isScanning ? <CameraOff size={16} /> : <Camera size={16} />}
                      {isScanning ? 'Stop Camera' : 'Start Camera'}
                    </button>
                  </div>
                }
              />
            )
          },
          {
            id: 'scan-history',
            label: 'History',
            content: <ScanHistoryTab companyId={companyId || ''} searchTerm={scanHistorySearchTerm} />,
          },
        ]}
      />
    </BasePage>
  )
}
