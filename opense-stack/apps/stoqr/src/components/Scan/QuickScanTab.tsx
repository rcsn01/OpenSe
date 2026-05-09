import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ArrowLeft, Check, Minus, Plus, SearchX, X } from 'lucide-react'
import { StackLayout } from '@repo/ui'
import { useProductFolders } from '../../hooks/queries/useProducts'
import {
  useQuickScanLookup,
  useQuickScanTransaction,
  useQuickScanUser,
} from '../../hooks/queries/useQuickScan'
import { SCAN_REASON_LABELS, type ScanUpdateReason } from '../../lib/scanReason'
import { getPublicImageUrl } from '../../utils'

const REASON_OPTIONS: Array<{ value: ScanUpdateReason; label: string }> = [
  { value: 'new_delivery', label: SCAN_REASON_LABELS.new_delivery },
  { value: 'consumed', label: SCAN_REASON_LABELS.consumed },
  { value: 'sold', label: SCAN_REASON_LABELS.sold },
  { value: 'inventory_audit', label: SCAN_REASON_LABELS.inventory_audit },
]

const QUICK_ADJUSTMENTS = [5, 10, 25, 50]

const buildFolderPathLabel = (
  folderId: string | null,
  folders: Array<{ id: string; name: string; parent_id: string | null }>,
) => {
  if (!folderId) return 'Unassigned'

  const labels: string[] = []
  const folderMap = new Map(folders.map((folder) => [folder.id, folder]))
  let currentFolder = folderMap.get(folderId)

  while (currentFolder) {
    labels.unshift(currentFolder.name)
    currentFolder = currentFolder.parent_id ? folderMap.get(currentFolder.parent_id) : undefined
  }

  return labels.length ? labels.join(', ') : 'Unassigned'
}

const formatRelativeTime = (value: string | null) => {
  if (!value) return 'No recent updates'

  const timestamp = new Date(value).getTime()
  if (Number.isNaN(timestamp)) return 'No recent updates'

  const diffMinutes = Math.round((Date.now() - timestamp) / 60000)

  if (diffMinutes <= 1) return 'Just now'
  if (diffMinutes < 60) return `${diffMinutes} min ago`

  const diffHours = Math.round(diffMinutes / 60)
  if (diffHours < 24) return `${diffHours} hour${diffHours === 1 ? '' : 's'} ago`

  const diffDays = Math.round(diffHours / 24)
  if (diffDays < 7) return `${diffDays} day${diffDays === 1 ? '' : 's'} ago`

  return new Date(value).toLocaleDateString()
}

const clampQuantity = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0))

export const QuickScanTab = ({
  scanValue,
  setScanValue,
  companyId,
  entryMethod,
  cameraContent,
  onResetSearch,
}: {
  scanValue: string
  setScanValue: (value: string) => void
  companyId: string
  entryMethod: 'camera' | 'manual'
  cameraContent?: ReactNode
  onResetSearch?: () => void
}) => {
  const [draftQuantity, setDraftQuantity] = useState(0)
  const [reason, setReason] = useState<ScanUpdateReason>('new_delivery')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)
  const { data: userId } = useQuickScanUser()
  const { data: folders = [] } = useProductFolders(companyId || null)
  const lookupQuery = useQuickScanLookup(companyId, scanValue)
  const transactionMutation = useQuickScanTransaction()

  const product = lookupQuery.data?.product ?? null
  const notFoundSku = lookupQuery.data?.notFoundSku ?? null
  const lastUpdatedAt = lookupQuery.data?.lastUpdatedAt ?? null

  useEffect(() => {
    if (!scanValue) {
      setMessage(null)
      setReason('new_delivery')
      setNote('')
    }
  }, [scanValue])

  useEffect(() => {
    if (product) {
      setDraftQuantity(product.quantity_on_hand)
      setMessage(null)
    }
  }, [product])

  const locationLabel = useMemo(
    () => buildFolderPathLabel(product?.folder_id ?? null, folders),
    [folders, product?.folder_id],
  )
  const primaryImageUrl = useMemo(() => {
    const imagePath = product?.image_urls?.[0]
    return imagePath ? getPublicImageUrl(imagePath) : ''
  }, [product?.image_urls])

  const hasQuantityChange = product ? draftQuantity !== product.quantity_on_hand : false
  const canConfirm = !!product && !transactionMutation.isPending && (hasQuantityChange || reason === 'inventory_audit')

  const handleReturnToScanner = () => {
    setScanValue('')
    setMessage(null)
    setReason('new_delivery')
    setNote('')
    onResetSearch?.()
  }

  const handleDraftInput = (value: string) => {
    setDraftQuantity(clampQuantity(Number(value || 0)))
    setMessage(null)
  }

  const handleDraftAdjust = (delta: number) => {
    setDraftQuantity((current) => clampQuantity(current + delta))
    setMessage(null)
  }

  const handleConfirm = async () => {
    if (!companyId || !product || !userId) return

    const quantityDiff = draftQuantity - product.quantity_on_hand
    if (quantityDiff === 0 && reason !== 'inventory_audit') {
      setMessage('Adjust the quantity or choose Inventory Audit to log a no-change check.')
      return
    }

    const transactionType = quantityDiff > 0 ? 'scan_in' : quantityDiff < 0 ? 'scan_out' : 'lookup'

    try {
      await transactionMutation.mutateAsync({
        companyId,
        productId: product.id,
        userId,
        transactionType,
        quantity: Math.abs(quantityDiff),
        barcode: scanValue,
        entryMethod,
        reason,
        note,
        stockAfter: draftQuantity,
      })
      setMessage(reason === 'inventory_audit' && quantityDiff === 0 ? 'Inventory audit logged.' : 'Inventory updated.')
      setNote('')
      await lookupQuery.refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transaction failed.')
    }
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
            <div className="scan-update-shell">
              <section className="scan-update-main">
                <div className="scan-product-summary">
                  <section className="scan-product-photo-card" aria-label="Product photo">
                    {primaryImageUrl ? (
                      <img
                        src={primaryImageUrl}
                        alt={product.name}
                        className="scan-product-photo"
                      />
                    ) : (
                      <div className="scan-product-photo-placeholder">
                        No product image uploaded
                      </div>
                    )}
                  </section>
                  <div className="scan-product-identity">
                    <div className="scan-product-kicker-row">
                      <button
                        type="button"
                        className="scan-update-back scan-update-back--mobile-inline"
                        aria-label="Close update view"
                        onClick={handleReturnToScanner}
                      >
                        <X size={18} />
                      </button>
                      <p className="scan-product-sku">{product.sku || 'No SKU assigned'}</p>
                    </div>
                    <h2 className="scan-product-name">{product.name}</h2>
                  </div>
                </div>

                <dl className="scan-product-meta-grid">
                  <div className="scan-product-meta-row">
                    <dt>Location</dt>
                    <dd>{locationLabel}</dd>
                  </div>
                  <div className="scan-product-meta-row">
                    <dt>Last updated</dt>
                    <dd>{formatRelativeTime(lastUpdatedAt)}</dd>
                  </div>
                </dl>

                <div className="scan-update-fields-row">
                  <div className="scan-update-section">
                    <p className="scan-update-label">Reason for update</p>
                    <select
                      className="scan-reason-select"
                      aria-label="Reason for update"
                      value={reason}
                      onChange={(event) => {
                        setReason(event.target.value as ScanUpdateReason)
                        setMessage(null)
                      }}
                    >
                      {REASON_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>
                          {option.label}
                        </option>
                      ))}
                    </select>
                    <div className="scan-reason-grid" role="radiogroup" aria-label="Reason for update">
                      {REASON_OPTIONS.map((option) => (
                        <label key={option.value} className="scan-reason-option">
                          <input
                            type="radio"
                            name="scan-reason"
                            checked={reason === option.value}
                            onChange={() => {
                              setReason(option.value)
                              setMessage(null)
                            }}
                          />
                          <span>{option.label}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="scan-update-section">
                    <p className="scan-update-label">Optional Notes</p>
                    <textarea
                      className="scan-update-notes"
                      aria-label="Optional Notes"
                      placeholder="Add details..."
                      value={note}
                      onChange={(event) => {
                        setNote(event.target.value)
                        setMessage(null)
                      }}
                      rows={2}
                    />
                  </div>
                </div>
              </section>

              <section className="scan-update-controls">
                <div className="scan-current-stock-row">
                  <span className="scan-update-label">Current Stock</span>
                  <strong className="scan-current-stock-value">{product.quantity_on_hand}</strong>
                </div>

                <div className="scan-quantity-stage">
                  <p className="scan-update-label scan-update-label--center">New Quantity</p>

                  <div className="scan-quantity-row">
                    <button
                      type="button"
                      className="scan-quantity-button"
                      aria-label="Decrease quantity"
                      onClick={() => handleDraftAdjust(-1)}
                    >
                      <Minus size={22} />
                    </button>

                    <input
                      className="scan-quantity-input"
                      type="number"
                      min={0}
                      value={draftQuantity}
                      aria-label="New quantity"
                      onChange={(event) => handleDraftInput(event.target.value)}
                    />

                    <button
                      type="button"
                      className="scan-quantity-button"
                      aria-label="Increase quantity"
                      onClick={() => handleDraftAdjust(1)}
                    >
                      <Plus size={22} />
                    </button>
                  </div>

                  <div className="scan-quick-adjust-grid">
                    {QUICK_ADJUSTMENTS.map((adjustment) => (
                      <button
                        key={`plus-${adjustment}`}
                        type="button"
                        className="scan-chip-button"
                        onClick={() => handleDraftAdjust(adjustment)}
                      >
                        +{adjustment}
                      </button>
                    ))}
                    {QUICK_ADJUSTMENTS.map((adjustment) => (
                      <button
                        key={`minus-${adjustment}`}
                        type="button"
                        className="scan-chip-button"
                        onClick={() => handleDraftAdjust(-adjustment)}
                      >
                        -{adjustment}
                      </button>
                    ))}
                  </div>
                </div>

                {message ? <p className="scan-update-message">{message}</p> : null}

                <button
                  type="button"
                  className="scan-confirm-button"
                  onClick={handleConfirm}
                  disabled={!canConfirm}
                >
                  <Check size={16} />
                  {transactionMutation.isPending ? 'Updating…' : 'Confirm Update'}
                </button>
              </section>
            </div>
          ) : null}
        </section>
      )}
    </StackLayout>
  )
}
