import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Html5Qrcode, Html5QrcodeSupportedFormats } from 'html5-qrcode'
import { Camera, CameraOff, ScanBarcode } from 'lucide-react'
import { useCompany } from '../contexts/CompanyContext'
import { BasePage } from '../components/BasePage'
import { usePageTopBarSearch, useTopBarSearchValue } from '../components/Search/TopBarSearch'
import { Tabs } from '../components/Tabs'
import { QuickScanTab } from '../components/Scan/QuickScanTab'
import { ScanHistoryTab } from '../components/Scan/ScanHistoryTab'
import { toast } from 'sonner'
import { useInventoryProducts } from '../hooks/queries/useInventory'
import { useScanHistory } from '../hooks/queries/useQuickScan'
import { useDebouncedValue } from '../hooks/useDebouncedValue'
import { defaultInventoryUrlState } from './inventoryUrlState'
import { normalizePageSearchTerm } from '../lib/pageSearch'

export const ScanPage = () => {
  const { companyId } = useCompany()
  const navigate = useNavigate()
  const { tab } = useParams<{ tab?: string }>()
  const validTabs = ['scan-actions', 'scan-history'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'scan-actions'
  const { searchValue, setSearchValue } = useTopBarSearchValue()
  const debouncedSearchValue = useDebouncedValue(searchValue, 250)
  const scanHistorySearchTerm = activeTab === 'scan-history' ? searchValue : ''
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

    const normalizedSearchValue = normalizePageSearchTerm(searchValue)
    setScanValue(normalizedSearchValue)
    setEntryMethod('manual')
  }, [activeTab, searchValue])

  const productSuggestions = useMemo(
    () => (productSuggestionsQuery.data?.products ?? []).slice(0, 8).map((product) => ({
      id: `scan-product-${product.id}`,
      title: product.name,
      subtitle: `${product.sku} · ${product.quantity_on_hand} on hand`,
      value: product.sku || product.name,
      badge: 'Product',
    })),
    [productSuggestionsQuery.data?.products],
  )
  const historySuggestions = useMemo(
    () => (scanHistoryQuery.data ?? []).slice(0, 8).map((event) => ({
      id: `scan-history-${event.id}`,
      title: event.product?.name ?? 'Unknown item',
      subtitle: `${event.product?.sku ?? event.barcode ?? '—'} · ${event.actorName}`,
      value: event.product?.sku ?? event.barcode ?? event.product?.name ?? '',
      badge: event.entry_method,
    })),
    [scanHistoryQuery.data],
  )
  const handleProductSuggestionSelect = useCallback((suggestion: { value: string }) => {
    setScanValue(suggestion.value)
    setEntryMethod('manual')
  }, [])

  usePageTopBarSearch(useMemo(() => (
    activeTab === 'scan-actions'
      ? {
          searchKey: 'scan-actions',
          placeholder: 'Search products...',
          defaultSuggestions: [
            { id: 'scanner-scan', title: 'Search by Barcode or SKU', subtitle: 'Look up a product before adjusting stock', value: 'sku', badge: 'Scanner' },
          ],
          suggestions: productSuggestions,
          onSuggestionSelect: handleProductSuggestionSelect,
        }
      : {
          searchKey: 'scan-history',
          placeholder: 'Search history...',
          defaultSuggestions: [
            { id: 'scan-history-camera', title: 'Camera Scans', subtitle: 'Recent barcode scans captured by camera', value: 'camera', badge: 'History' },
            { id: 'scan-history-manual', title: 'Manual Entries', subtitle: 'Recent scans entered manually', value: 'manual', badge: 'History' },
          ],
          suggestions: historySuggestions,
        }
  ), [activeTab, handleProductSuggestionSelect, historySuggestions, productSuggestions]))

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
    setSearchValue('')
  }, [setSearchValue, stopCamera])

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
                  <div className="scan-camera-panel">
                    <div className={`scan-camera-frame${isScanning ? ' is-active' : ''}`}>
                      <div
                        id="reader"
                        className="scan-camera-reader"
                      />
                      {!isScanning && (
                        <div className="scan-camera-placeholder">
                          <div className="scan-camera-placeholder-icon">
                            <ScanBarcode size={22} />
                          </div>
                          <h2 className="scan-camera-placeholder-title">Camera is off</h2>
                          <p className="scan-camera-placeholder-copy">Tap below to activate your camera and scan a product.</p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      className={`scan-camera-toggle${isScanning ? ' is-active' : ''}`}
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
