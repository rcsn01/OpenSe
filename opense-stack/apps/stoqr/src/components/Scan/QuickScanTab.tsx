import { useEffect, useState, type ReactNode } from 'react'
import { SearchX, ScanBarcode, Package, ArrowUpCircle, ArrowDownCircle, SlidersHorizontal } from 'lucide-react'
import { StackLayout } from '@repo/ui'
import {
  useQuickScanLookup,
  useQuickScanTransaction,
  useQuickScanUser,
} from '../../hooks/queries/useQuickScan'

export type StockMode = 'manual' | 'receive' | 'dispatch'

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
  const [quantity, setQuantity] = useState(1)
  const [manualStock, setManualStock] = useState<number | ''>('')
  const [message, setMessage] = useState<string | null>(null)
  const [stockMode, setStockMode] = useState<StockMode>('receive')
  const [pendingConfirm, setPendingConfirm] = useState(false)
  const { data: userId } = useQuickScanUser()
  const lookupQuery = useQuickScanLookup(companyId, scanValue)
  const transactionMutation = useQuickScanTransaction()

  const product = lookupQuery.data?.product ?? null
  const notFoundSku = lookupQuery.data?.notFoundSku ?? null
  const lastHandledBy = lookupQuery.data?.lastHandledBy ?? '—'

  useEffect(() => {
    if (!scanValue) {
      setMessage(null)
      setPendingConfirm(false)
    }
  }, [scanValue])

  useEffect(() => {
    if (product) {
      setManualStock(product.quantity_on_hand)
    }
  }, [product])

  const computeNewStock = (): number => {
    if (!product) return 0
    if (stockMode === 'manual') return Number(manualStock) || 0
    if (stockMode === 'receive') return product.quantity_on_hand + quantity
    return Math.max(0, product.quantity_on_hand - quantity)
  }

  const handleConfirm = async () => {
    if (!companyId || !product || !userId) return
    setMessage(null)

    const newStock = computeNewStock()
    const diff = newStock - product.quantity_on_hand

    if (diff === 0) {
      setMessage('No stock change to apply.')
      setPendingConfirm(false)
      return
    }

    const transactionType: 'scan_in' | 'scan_out' = diff > 0 ? 'scan_in' : 'scan_out'

    try {
      await transactionMutation.mutateAsync({
        companyId,
        productId: product.id,
        userId,
        transactionType,
        quantity: Math.abs(diff),
        barcode: scanValue,
        entryMethod,
      })
      setMessage(diff > 0 ? `+${diff} stock added successfully.` : `${diff} stock removed successfully.`)
      setPendingConfirm(false)
      await lookupQuery.refetch()
    } catch (error) {
      setMessage(error instanceof Error ? error.message : 'Transaction failed.')
    }
  }

  const handleCancel = () => {
    setPendingConfirm(false)
    setQuantity(1)
    if (product) setManualStock(product.quantity_on_hand)
  }

  const handleMarkOutOfStock = () => {
    setStockMode('manual')
    setManualStock(0)
    setPendingConfirm(true)
  }

  const handleFullRestock = () => {
    if (!product) return
    setStockMode('manual')
    setManualStock(product.reorder_point > 0 ? product.reorder_point * 2 : 100)
    setPendingConfirm(true)
  }

  const handleSearchAgain = () => {
    setScanValue('')
    onResetSearch?.()
  }

  const stockDiff = product ? computeNewStock() - product.quantity_on_hand : 0

  return (
    <StackLayout className="flex-1 min-h-0">
      {!scanValue ? (
        <div className="flex flex-1 min-h-0 flex-col overflow-hidden rounded-2xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
          <div className="flex flex-1 min-h-0 flex-col p-5">
            {cameraContent ?? (
              <div className="flex flex-1 flex-col items-center justify-center rounded-lg bg-[var(--color-muted)] py-12 text-[var(--color-muted-foreground)]">
                <div className="mb-3 rounded-full bg-[var(--color-background)] p-3.5 shadow-sm">
                  <ScanBarcode size={24} className="text-[var(--color-primary)]" />
                </div>
                <p className="text-sm font-medium">Scan a barcode or QR code to begin</p>
              </div>
            )}
          </div>
        </div>
      ) : (
        <>
          {/* Product Card */}
          <div className="rounded-xl border border-[var(--color-border)] bg-[var(--color-card)] shadow-sm">
            {/* Product Header */}
            <div className="border-b border-[var(--color-border)] p-5">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <h2 className="text-lg font-semibold text-[var(--color-card-foreground)]">
                    {lookupQuery.isLoading ? 'Looking up…' : product?.name ?? 'Product Not Found'}
                  </h2>
                  {product && (
                    <p className="mt-0.5 text-sm text-[var(--color-muted-foreground)]">SKU: {product.sku}</p>
                  )}
                </div>

                {product && (
                  <div className="flex flex-col items-end gap-1">
                    <span className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-sm font-medium ${
                      product.quantity_on_hand === 0
                        ? 'bg-[var(--color-destructive-light)] text-[var(--color-destructive)]'
                        : product.quantity_on_hand <= product.reorder_point
                          ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                          : 'bg-[var(--color-success-light)] text-[var(--color-success)]'
                    }`}>
                      <Package size={14} />
                      {product.quantity_on_hand} in stock
                    </span>
                    <span className="text-xs text-[var(--color-muted-foreground)]">
                      Last handled by {lastHandledBy}
                    </span>
                  </div>
                )}
              </div>
            </div>

            {lookupQuery.isLoading && (
              <div className="flex items-center justify-center p-8 text-sm text-[var(--color-muted-foreground)]">
                Looking up product…
              </div>
            )}

            {!product && notFoundSku && !lookupQuery.isLoading && (
              <div className="flex flex-col items-center justify-center gap-3 p-8 text-[var(--color-muted-foreground)]">
                <SearchX size={32} />
                <p className="text-sm">No product found for: <strong className="text-[var(--color-card-foreground)]">{notFoundSku}</strong></p>
              </div>
            )}

            {product && (
              <>
                {/* Stock Mode Selector */}
                <div className="border-b border-[var(--color-border)] p-5">
                  <h3 className="mb-3 text-sm font-medium text-[var(--color-muted-foreground)]">Update Mode</h3>
                  <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label="Stock update mode">
                    {([
                      { mode: 'manual' as StockMode, label: 'Manual', icon: SlidersHorizontal, desc: 'Set exact amount' },
                      { mode: 'receive' as StockMode, label: 'Receive', icon: ArrowUpCircle, desc: 'Add to stock' },
                      { mode: 'dispatch' as StockMode, label: 'Dispatch', icon: ArrowDownCircle, desc: 'Remove from stock' },
                    ]).map(({ mode, label, icon: Icon, desc }) => (
                      <button
                        key={mode}
                        role="radio"
                        aria-checked={stockMode === mode}
                        onClick={() => { setStockMode(mode); setPendingConfirm(false); setMessage(null) }}
                        className={`flex flex-col items-center gap-1.5 rounded-lg border-2 p-3 text-center transition-all ${
                          stockMode === mode
                            ? 'border-[var(--color-primary)] bg-[var(--color-primary)]/5 text-[var(--color-primary)]'
                            : 'border-[var(--color-border)] text-[var(--color-muted-foreground)] hover:border-[var(--color-border-hover)]'
                        }`}
                      >
                        <Icon size={20} />
                        <span className="text-sm font-medium">{label}</span>
                        <span className="text-xs opacity-70">{desc}</span>
                      </button>
                    ))}
                  </div>
                </div>

                {/* Quantity Input */}
                <div className="p-5">
                  {stockMode === 'manual' ? (
                    <label className="stack">
                      <span className="text-sm font-medium text-[var(--color-card-foreground)]">Set stock to</span>
                      <input
                        className="input text-center text-lg font-semibold"
                        type="number"
                        min={0}
                        value={manualStock}
                        onChange={(event) => {
                          setManualStock(event.target.value === '' ? '' : Number(event.target.value))
                          setPendingConfirm(true)
                        }}
                        aria-label="Set stock amount"
                      />
                    </label>
                  ) : (
                    <label className="stack">
                      <span className="text-sm font-medium text-[var(--color-card-foreground)]">
                        {stockMode === 'receive' ? 'Quantity to receive' : 'Quantity to dispatch'}
                      </span>
                      <input
                        className="input text-center text-lg font-semibold"
                        type="number"
                        min={1}
                        value={quantity}
                        onChange={(event) => {
                          setQuantity(Number(event.target.value || 1))
                          setPendingConfirm(true)
                        }}
                        aria-label="Quantity"
                      />
                    </label>
                  )}

                  {/* Stock Preview */}
                  {pendingConfirm && (
                    <div className="mt-3 flex items-center justify-between rounded-lg bg-[var(--color-muted)] px-4 py-2.5">
                      <span className="text-sm text-[var(--color-muted-foreground)]">New stock level:</span>
                      <span className={`text-base font-bold ${
                        stockDiff > 0 ? 'text-[var(--color-success)]' : stockDiff < 0 ? 'text-[var(--color-destructive)]' : ''
                      }`}>
                        {computeNewStock()}
                        {stockDiff !== 0 && (
                          <span className="ml-1, text-sm font-normal">
                            ({stockDiff > 0 ? '+' : ''}{stockDiff})
                          </span>
                        )}
                      </span>
                    </div>
                  )}

                  {/* Quick Actions */}
                  <div className="mt-4 flex gap-2">
                    <button
                      className="flex-1 rounded-lg border border-[var(--color-destructive)] px-3 py-2 text-sm font-medium text-[var(--color-destructive)] transition-colors hover:bg-[var(--color-destructive-light)]"
                      onClick={handleMarkOutOfStock}
                      disabled={transactionMutation.isPending || product.quantity_on_hand === 0}
                    >
                      Mark Out of Stock
                    </button>
                    <button
                      className="flex-1 rounded-lg border border-[var(--color-success)] px-3 py-2 text-sm font-medium text-[var(--color-success)] transition-colors hover:bg-[var(--color-success-light)]"
                      onClick={handleFullRestock}
                      disabled={transactionMutation.isPending}
                    >
                      Full Restock
                    </button>
                  </div>

                  {/* Confirm / Cancel */}
                  <div className="mt-4 flex gap-2">
                    <button
                      className="flex-1 rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)]"
                      onClick={handleCancel}
                      disabled={transactionMutation.isPending}
                    >
                      Cancel
                    </button>
                    <button
                      className="button flex-1"
                      onClick={handleConfirm}
                      disabled={transactionMutation.isPending || !pendingConfirm}
                    >
                      {transactionMutation.isPending ? 'Updating…' : 'Confirm Update'}
                    </button>
                  </div>
                </div>
              </>
            )}

            {message && (
              <div className={`mx-5 mb-5 rounded-lg px-4 py-2.5 text-sm font-medium ${
                message.includes('failed') || message.includes('No stock')
                  ? 'bg-[var(--color-warning-light)] text-[var(--color-warning)]'
                  : 'bg-[var(--color-success-light)] text-[var(--color-success)]'
              }`}>
                {message}
              </div>
            )}
          </div>

          {/* Search Again */}
          <button
            className="mt-2 w-full rounded-lg border border-[var(--color-border)] px-4 py-2.5 text-sm font-medium text-[var(--color-muted-foreground)] transition-colors hover:bg-[var(--color-muted)]"
            onClick={handleSearchAgain}
          >
            Search Again
          </button>
        </>
      )}
    </StackLayout>
  )
}
