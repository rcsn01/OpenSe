import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, Check, Minus, Plus } from 'lucide-react'
import { EmptyState } from '@repo/ui'

import { BasePage } from '../../components/BasePage'
import { useCompany } from '../../contexts/CompanyContext'
import { useProductDetail, useProductFolders } from '../../hooks/queries/useProducts'
import { useQuickScanTransaction, useQuickScanUser } from '../../hooks/queries/useQuickScan'
import { getPublicImageUrl } from '../../utils'
import '../../components/Scan/ScanSurface.css'

const QUICK_ADJUSTMENTS = [5, 10, 25, 50]

const clampQuantity = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0))

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

const getEntryMethod = (value: string | null): 'camera' | 'manual' => (value === 'camera' ? 'camera' : 'manual')

export const ProductAdjustPage = () => {
  const { id } = useParams<{ id?: string }>()
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { companyId } = useCompany()
  const { data, isLoading, refetch } = useProductDetail(companyId, id ?? null)
  const { data: folders = [] } = useProductFolders(companyId)
  const { data: userId } = useQuickScanUser()
  const transactionMutation = useQuickScanTransaction()

  const product = data?.product ?? null
  const lastUpdatedAt = data?.transactions[0]?.created_at ?? null
  const barcode = searchParams.get('barcode') || product?.sku || null
  const entryMethod = getEntryMethod(searchParams.get('entryMethod'))
  const returnTo = searchParams.get('returnTo')

  const [draftQuantity, setDraftQuantity] = useState(0)
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [note, setNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      const initialFolderId = product.folder_stocks?.[0]?.folder_id ?? product.folder_id ?? ''
      const initialFolderStock = product.folder_stocks?.find((stock) => stock.folder_id === initialFolderId)
      setSelectedFolderId(initialFolderId)
      setDraftQuantity(initialFolderStock?.quantity_on_hand ?? product.quantity_on_hand)
      setMessage(null)
    }
  }, [product])

  const selectedFolderStock = useMemo(
    () => product?.folder_stocks?.find((stock) => stock.folder_id === selectedFolderId) ?? null,
    [product?.folder_stocks, selectedFolderId],
  )
  const currentFolderQuantity = selectedFolderStock?.quantity_on_hand ?? product?.quantity_on_hand ?? 0

  const locationLabel = useMemo(
    () => buildFolderPathLabel(selectedFolderId || product?.folder_id || null, folders),
    [folders, product?.folder_id, selectedFolderId],
  )

  const primaryImageUrl = useMemo(() => {
    const imagePath = product?.image_urls?.[0]
    return imagePath ? getPublicImageUrl(imagePath) : ''
  }, [product?.image_urls])

  const hasQuantityChange = product ? draftQuantity !== currentFolderQuantity : false
  const canConfirm = !!product && !!selectedFolderId && !transactionMutation.isPending && hasQuantityChange
  const statusMessage = message ?? (product && selectedFolderId && !hasQuantityChange ? 'Adjust the quantity before confirming.' : null)

  const handleBack = () => {
    if (returnTo) {
      navigate(returnTo)
      return
    }

    if (product) {
      navigate(`/inventory/${product.id}/overview`)
      return
    }

    navigate('/inventory/all')
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

    if (!selectedFolderId) {
      setMessage('Select a folder before adjusting stock.')
      return
    }

    const quantityDiff = draftQuantity - currentFolderQuantity
    if (quantityDiff === 0) {
      setMessage('Adjust the quantity before confirming.')
      return
    }

    const transactionType = quantityDiff > 0 ? 'scan_in' : 'scan_out'

    try {
      await transactionMutation.mutateAsync({
        companyId,
        productId: product.id,
        userId,
        transactionType,
        quantity: Math.abs(quantityDiff),
        barcode,
        entryMethod,
        note,
        stockAfter: draftQuantity,
        folderId: selectedFolderId,
      })
      setMessage('Inventory updated.')
      setNote('')
      await refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transaction failed.')
    }
  }

  if (!id) {
    return <EmptyState title="Product not found" description="Missing product id in route." />
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      loadingMessage="Loading product..."
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to adjust stock."
      contentClassName="flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]"
      containerClassName="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden"
    >
      {product ? (
        <section className="scan-update-view product-adjust-page" aria-label="Adjust inventory">
          <header className="scan-update-topbar">
            <button
              type="button"
              className="scan-update-back scan-update-back--desktop"
              aria-label="Back"
              onClick={handleBack}
            >
              <span className="scan-update-back-desktop">
                <ArrowLeft size={15} />
                Back
              </span>
            </button>
          </header>

          <div className="scan-update-shell scan-update-shell--product-adjust">
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
                    <p className="scan-product-sku">{product.sku || 'No SKU assigned'}</p>
                  </div>
                  <h2 className="scan-product-name">{product.name}</h2>
                </div>
              </div>

              <dl className="scan-product-meta-grid">
                <div className="scan-product-meta-row">
                  <dt>Location</dt>
                  <dd>
                    <select
                      className="scan-reason-select"
                      aria-label="Stock folder"
                      value={selectedFolderId}
                      onChange={(event) => {
                        const nextFolderId = event.target.value
                        const nextStock = product.folder_stocks?.find((stock) => stock.folder_id === nextFolderId)
                        setSelectedFolderId(nextFolderId)
                        setDraftQuantity(nextStock?.quantity_on_hand ?? 0)
                        setMessage(null)
                      }}
                    >
                      <option value="">Select folder</option>
                      {folders.map((folder) => (
                        <option key={folder.id} value={folder.id}>
                          {buildFolderPathLabel(folder.id, folders)}
                        </option>
                      ))}
                    </select>
                    <span className="sr-only">{locationLabel}</span>
                  </dd>
                </div>
                <div className="scan-product-meta-row">
                  <dt>Last updated</dt>
                  <dd>{formatRelativeTime(lastUpdatedAt)}</dd>
                </div>
              </dl>

              <div className="scan-update-fields-row">
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
                <strong className="scan-current-stock-value">{currentFolderQuantity}</strong>
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

              {statusMessage ? <p className="scan-update-message">{statusMessage}</p> : null}

              <button
                type="button"
                className="scan-confirm-button"
                onClick={handleConfirm}
                disabled={!canConfirm}
              >
                <Check size={16} />
                {transactionMutation.isPending ? 'Updating...' : 'Confirm Update'}
              </button>
            </section>
          </div>
        </section>
      ) : (
        <EmptyState title="Product not found" description="Check the inventory list again." />
      )}
    </BasePage>
  )
}
