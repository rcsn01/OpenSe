import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams, useSearchParams } from 'react-router-dom'
import { ArrowLeft, ArrowRightLeft, Check, Minus, Plus } from 'lucide-react'
import { EmptyState, Heading } from '@repo/ui'

import { BasePage } from '../../components/BasePage'
import { FolderSelectionTree } from '../../components/Inventory/FolderSelectionTree'
import { useCompany } from '../../contexts/CompanyContext'
import { useProductDetail, useProductFolders, useTransferProductStock } from '../../hooks/queries/useProducts'
import { useQuickScanTransaction, useQuickScanUser } from '../../hooks/queries/useQuickScan'
import { getPublicImageUrl } from '../../utils'
import '../../components/Scan/ScanSurface.css'

const QUICK_ADJUSTMENTS = [5, 10, 25, 50]

const clampQuantity = (value: number) => Math.max(0, Math.round(Number.isFinite(value) ? value : 0))
const clampTransferQuantity = (value: number, maxQuantity: number) => (
  Math.min(maxQuantity, clampQuantity(value))
)

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
  const [searchParams, setSearchParams] = useSearchParams()
  const { companyId } = useCompany()
  const { data, isLoading, refetch } = useProductDetail(companyId, id ?? null)
  const { data: folders = [] } = useProductFolders(companyId)
  const { data: userId } = useQuickScanUser()
  const transactionMutation = useQuickScanTransaction()
  const transferMutation = useTransferProductStock(companyId, id ?? null)

  const product = data?.product ?? null
  const lastUpdatedAt = data?.transactions[0]?.created_at ?? null
  const barcode = searchParams.get('barcode') || product?.sku || null
  const entryMethod = getEntryMethod(searchParams.get('entryMethod'))
  const returnTo = searchParams.get('returnTo')
  const requestedFolderId = searchParams.get('folderId') ?? ''
  const isScannerFlow = returnTo?.startsWith('/scan') ?? false
  const mode = searchParams.get('mode') === 'transfer' ? 'transfer' : 'adjust'

  const [draftQuantity, setDraftQuantity] = useState(0)
  const [selectedFolderId, setSelectedFolderId] = useState('')
  const [note, setNote] = useState('')
  const [transferSourceFolderId, setTransferSourceFolderId] = useState('')
  const [transferDestinationFolderId, setTransferDestinationFolderId] = useState('')
  const [transferQuantity, setTransferQuantity] = useState('')
  const [transferNote, setTransferNote] = useState('')
  const [message, setMessage] = useState<string | null>(null)

  useEffect(() => {
    if (product) {
      const requestedFolderStock = requestedFolderId
        ? product.folder_stocks?.find((stock) => stock.folder_id === requestedFolderId)
        : null
      const hasValidRequestedFolder = !!requestedFolderStock
      const defaultFolderId = product.folder_stocks?.[0]?.folder_id ?? product.folder_id ?? ''
      const initialFolderId = hasValidRequestedFolder
        ? requestedFolderId
        : isScannerFlow
          ? ''
          : defaultFolderId
      const initialFolderStock = product.folder_stocks?.find((stock) => stock.folder_id === initialFolderId)
      const defaultTransferSourceId = product.folder_stocks?.find((stock) => stock.quantity_on_hand > 0)?.folder_id ?? ''
      const initialTransferSourceId = hasValidRequestedFolder
        ? requestedFolderId
        : isScannerFlow
          ? ''
          : defaultTransferSourceId
      setSelectedFolderId(initialFolderId)
      setDraftQuantity(initialFolderId ? (initialFolderStock?.quantity_on_hand ?? product.quantity_on_hand) : 0)
      setTransferSourceFolderId(initialTransferSourceId)
      setTransferDestinationFolderId('')
      setTransferQuantity('0')
      setMessage(null)
    }
  }, [isScannerFlow, product, requestedFolderId])

  const selectedFolderStock = useMemo(
    () => product?.folder_stocks?.find((stock) => stock.folder_id === selectedFolderId) ?? null,
    [product?.folder_stocks, selectedFolderId],
  )
  const currentFolderQuantity = selectedFolderStock?.quantity_on_hand ?? product?.quantity_on_hand ?? 0

  const folderStockByFolderId = useMemo(
    () => new Map((product?.folder_stocks ?? []).map((stock) => [stock.folder_id, stock])),
    [product?.folder_stocks],
  )

  const transferSourceStock = useMemo(
    () => folderStockByFolderId.get(transferSourceFolderId) ?? null,
    [folderStockByFolderId, transferSourceFolderId],
  )
  const transferAvailableQuantity = transferSourceStock?.quantity_on_hand ?? 0
  const transferQuantityNumber = Number(transferQuantity)
  const hasValidTransferQuantity = (
    transferQuantity.trim().length > 0 &&
    Number.isInteger(transferQuantityNumber) &&
    transferQuantityNumber >= 1 &&
    transferQuantityNumber <= transferAvailableQuantity
  )
  const disabledTransferSourceFolderIds = useMemo(
    () => folders
      .filter((folder) => (folderStockByFolderId.get(folder.id)?.quantity_on_hand ?? 0) <= 0)
      .map((folder) => folder.id),
    [folderStockByFolderId, folders],
  )
  const hiddenTransferDestinationFolderIds = useMemo(
    () => (transferSourceFolderId ? [transferSourceFolderId] : []),
    [transferSourceFolderId],
  )
  const getFolderStockMetaLabel = useMemo(
    () => (folderId: string) => {
      const quantity = folderStockByFolderId.get(folderId)?.quantity_on_hand ?? 0
      return String(quantity)
    },
    [folderStockByFolderId],
  )

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
  const canConfirmTransfer = (
    !!product &&
    !!transferSourceFolderId &&
    !!transferDestinationFolderId &&
    transferSourceFolderId !== transferDestinationFolderId &&
    hasValidTransferQuantity &&
    !transferMutation.isPending
  )
  const statusMessage = message

  const handleModeChange = (nextMode: 'adjust' | 'transfer') => {
    const nextSearchParams = new URLSearchParams(searchParams)
    if (nextMode === 'transfer') {
      nextSearchParams.set('mode', 'transfer')
    } else {
      nextSearchParams.delete('mode')
    }
    setSearchParams(nextSearchParams, { replace: true })
    setMessage(null)
  }

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

  const handleAdjustFolderSelect = (folderId: string) => {
    const nextStock = product?.folder_stocks?.find((stock) => stock.folder_id === folderId)
    setSelectedFolderId(folderId)
    setDraftQuantity(nextStock?.quantity_on_hand ?? 0)
    setMessage(null)
  }

  const handleTransferSourceSelect = (folderId: string) => {
    setTransferSourceFolderId(folderId)
    setTransferDestinationFolderId((current) => (current === folderId ? '' : current))
    setTransferQuantity('0')
    setMessage(null)
  }

  const handleTransferDestinationSelect = (folderId: string) => {
    setTransferDestinationFolderId(folderId)
    setMessage(null)
  }

  const handleTransferQuantityInput = (value: string) => {
    setTransferQuantity(String(clampQuantity(Number(value || 0))))
    setMessage(null)
  }

  const handleTransferQuantityAdjust = (delta: number) => {
    setTransferQuantity((current) => (
      String(clampTransferQuantity(Number(current || 0) + delta, transferAvailableQuantity))
    ))
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

  const handleTransferConfirm = async () => {
    if (!product) return

    if (!transferSourceFolderId) {
      setMessage('Select a source location before transferring stock.')
      return
    }

    if (!transferDestinationFolderId || transferSourceFolderId === transferDestinationFolderId) {
      setMessage('Select a different destination location.')
      return
    }

    if (!hasValidTransferQuantity) {
      setMessage(`Enter a quantity from 1 to ${transferAvailableQuantity}.`)
      return
    }

    try {
      await transferMutation.mutateAsync({
        fromFolderId: transferSourceFolderId,
        toFolderId: transferDestinationFolderId,
        quantity: transferQuantityNumber,
        notes: transferNote,
      })
      setMessage('Stock transferred.')
      setTransferQuantity('0')
      setTransferNote('')
      await refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transfer failed.')
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
                  <Heading level="h3">{product.name}</Heading>
                  <div className="scan-mode-segment" role="tablist" aria-label="Stock action">
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'adjust'}
                      className={`scan-mode-button${mode === 'adjust' ? ' is-active' : ''}`}
                      onClick={() => handleModeChange('adjust')}
                    >
                      Adjust
                    </button>
                    <button
                      type="button"
                      role="tab"
                      aria-selected={mode === 'transfer'}
                      className={`scan-mode-button${mode === 'transfer' ? ' is-active' : ''}`}
                      onClick={() => handleModeChange('transfer')}
                    >
                      Transfer
                    </button>
                  </div>
                </div>
              </div>

              {mode === 'adjust' ? (
                <>
                  <div className="scan-adjust-meta-grid">
                    <section className="scan-transfer-tree-panel" aria-labelledby="adjust-location-heading">
                      <div className="scan-transfer-tree-header">
                        <h3 id="adjust-location-heading" className="scan-update-label">Location</h3>
                      </div>
                      <FolderSelectionTree
                        folders={folders}
                        selectedFolderId={selectedFolderId}
                        onSelectFolder={handleAdjustFolderSelect}
                        getFolderMetaLabel={getFolderStockMetaLabel}
                        ariaLabel="Stock folders"
                        emptyMessage="No folders available."
                      />
                      <span className="sr-only">{locationLabel}</span>
                    </section>

                    <div className="scan-adjust-last-updated">
                      <p className="scan-update-label">Last updated</p>
                      <p className="scan-adjust-last-updated-value">{formatRelativeTime(lastUpdatedAt)}</p>
                    </div>
                  </div>

                  <div className="scan-update-fields-row">
                    <div className="scan-update-section">
                      <p className="scan-update-label">Optional Notes</p>
                      <input
                        className="scan-update-notes"
                        aria-label="Optional Notes"
                        placeholder="Add details..."
                        value={note}
                        onChange={(event) => {
                          setNote(event.target.value)
                          setMessage(null)
                        }}
                      />
                    </div>
                  </div>
                </>
              ) : (
                <div className="scan-transfer-panel" aria-label="Transfer stock">
                  <div className="scan-transfer-grid">
                    <section className="scan-transfer-tree-panel" aria-labelledby="transfer-source-heading">
                      <div className="scan-transfer-tree-header">
                        <h3 id="transfer-source-heading" className="scan-update-label">Source</h3>
                      </div>
                      <FolderSelectionTree
                        folders={folders}
                        selectedFolderId={transferSourceFolderId}
                        onSelectFolder={handleTransferSourceSelect}
                        disabledFolderIds={disabledTransferSourceFolderIds}
                        getFolderMetaLabel={getFolderStockMetaLabel}
                        ariaLabel="Source folders"
                        emptyMessage="No source folders available."
                      />
                    </section>

                    <section className="scan-transfer-tree-panel" aria-labelledby="transfer-destination-heading">
                      <div className="scan-transfer-tree-header">
                        <h3 id="transfer-destination-heading" className="scan-update-label">Destination</h3>
                      </div>
                      <FolderSelectionTree
                        folders={folders}
                        selectedFolderId={transferDestinationFolderId}
                        onSelectFolder={handleTransferDestinationSelect}
                        hiddenFolderIds={hiddenTransferDestinationFolderIds}
                        ariaLabel="Destination folders"
                        emptyMessage="No destination folders available."
                      />
                    </section>
                  </div>

                  <div className="scan-update-section">
                    <p className="scan-update-label">Optional Notes</p>
                    <input
                      className="scan-update-notes"
                      aria-label="Transfer notes"
                      placeholder="Add details..."
                      value={transferNote}
                      onChange={(event) => {
                        setTransferNote(event.target.value)
                        setMessage(null)
                      }}
                    />
                  </div>
                </div>
              )}
            </section>

            {mode === 'adjust' ? (
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
                      className="scan-quantity-input text-2xl leading-snug tracking-tight text-[var(--color-heading)] md:text-3xl"
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
            ) : (
              <section className="scan-update-controls">
                <div className="scan-current-stock-row">
                  <span className="scan-update-label">Available to Transfer</span>
                  <strong className="scan-current-stock-value">{transferAvailableQuantity}</strong>
                </div>

                <div className="scan-quantity-stage">
                  <p className="scan-update-label scan-update-label--center">Transfer Quantity</p>

                  <div className="scan-quantity-row">
                    <button
                      type="button"
                      className="scan-quantity-button"
                      aria-label="Decrease transfer quantity"
                      onClick={() => handleTransferQuantityAdjust(-1)}
                    >
                      <Minus size={22} />
                    </button>

                    <input
                      className="scan-quantity-input text-2xl leading-snug tracking-tight text-[var(--color-heading)] md:text-3xl"
                      type="number"
                      min={0}
                      max={transferAvailableQuantity || undefined}
                      step={1}
                      value={transferQuantity}
                      aria-label="Transfer quantity"
                      onChange={(event) => handleTransferQuantityInput(event.target.value)}
                    />

                    <button
                      type="button"
                      className="scan-quantity-button"
                      aria-label="Increase transfer quantity"
                      onClick={() => handleTransferQuantityAdjust(1)}
                    >
                      <Plus size={22} />
                    </button>
                  </div>

                  <div className="scan-quick-adjust-grid">
                    {QUICK_ADJUSTMENTS.map((adjustment) => (
                      <button
                        key={`transfer-plus-${adjustment}`}
                        type="button"
                        className="scan-chip-button"
                        onClick={() => handleTransferQuantityAdjust(adjustment)}
                      >
                        +{adjustment}
                      </button>
                    ))}
                    {QUICK_ADJUSTMENTS.map((adjustment) => (
                      <button
                        key={`transfer-minus-${adjustment}`}
                        type="button"
                        className="scan-chip-button"
                        onClick={() => handleTransferQuantityAdjust(-adjustment)}
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
                  onClick={handleTransferConfirm}
                  disabled={!canConfirmTransfer}
                >
                  <ArrowRightLeft size={16} />
                  {transferMutation.isPending ? 'Transferring...' : 'Confirm Transfer'}
                </button>
              </section>
            )}
          </div>
        </section>
      ) : (
        <EmptyState title="Product not found" description="Check the inventory list again." />
      )}
    </BasePage>
  )
}
