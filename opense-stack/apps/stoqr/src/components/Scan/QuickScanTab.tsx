import { useEffect, useRef, type ReactNode } from 'react'
import { ArrowLeft, SearchX } from 'lucide-react'
import { StackLayout } from '@repo/ui'
import { useQuickScanLookup } from '../../hooks/queries/useQuickScan'
import type { Product } from '../../types'

export const QuickScanTab = ({
  scanValue,
  setScanValue,
  companyId,
  entryMethod,
  cameraContent,
  onResetSearch,
  onProductResolved,
}: {
  scanValue: string
  setScanValue: (value: string) => void
  companyId: string
  entryMethod: 'camera' | 'manual'
  cameraContent?: ReactNode
  onResetSearch?: () => void
  onProductResolved?: (product: Product, context: { scanValue: string; entryMethod: 'camera' | 'manual'; folderId: string | null }) => void
}) => {
  const lookupQuery = useQuickScanLookup(companyId, scanValue)
  const resolvedProductRef = useRef<string | null>(null)

  const product = lookupQuery.data?.product ?? null
  const notFoundSku = lookupQuery.data?.notFoundSku ?? null

  useEffect(() => {
    if (!scanValue) {
      resolvedProductRef.current = null
    }
  }, [scanValue])

  useEffect(() => {
    if (!product || !onProductResolved) return

    const folderId = lookupQuery.data?.folderId ?? null
    const resolvedKey = `${product.id}:${folderId ?? ''}:${scanValue}:${entryMethod}`
    if (resolvedProductRef.current === resolvedKey) return

    resolvedProductRef.current = resolvedKey
    onProductResolved(product, { scanValue, entryMethod, folderId })
  }, [entryMethod, lookupQuery.data?.folderId, onProductResolved, product, scanValue])

  const handleReturnToScanner = () => {
    setScanValue('')
    resolvedProductRef.current = null
    onResetSearch?.()
  }

  return (
    <StackLayout className="scan-tab-view">
      {!scanValue ? (
        <section className="scan-idle-view" aria-label="Scan item">
          <div className="scan-idle-stage">
            {cameraContent}
          </div>
        </section>
      ) : (
        <section className="scan-update-view" aria-label="Update inventory">
          <header className="scan-update-topbar">
            <button
              type="button"
              className="scan-update-back scan-update-back--desktop"
              aria-label="Back to scanner"
              onClick={handleReturnToScanner}
            >
              <span className="scan-update-back-desktop">
                <ArrowLeft size={15} />
                Back to scanner
              </span>
            </button>
          </header>

          {lookupQuery.isLoading ? (
            <div className="scan-feedback-panel">Looking up product…</div>
          ) : !product && notFoundSku ? (
            <div className="scan-feedback-panel scan-feedback-panel--missing">
              <SearchX size={28} />
              <div className="scan-feedback-copy">
                <h2 className="scan-feedback-title">Product not found</h2>
                <p className="scan-feedback-text">No product matched {notFoundSku}.</p>
              </div>
            </div>
          ) : product ? (
            <div className="scan-feedback-panel">
              <div className="scan-feedback-copy">
                <h2 className="scan-feedback-title">Product found</h2>
                <p className="scan-feedback-text">Opening stock adjustment for {product.name}.</p>
              </div>
            </div>
          ) : null}
        </section>
      )}
    </StackLayout>
  )
}
