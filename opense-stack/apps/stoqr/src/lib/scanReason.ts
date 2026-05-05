export const SCAN_REASON_LABELS = {
  new_delivery: 'New Delivery',
  consumed: 'Consumed',
  sold: 'Sold',
  inventory_audit: 'Inventory Audit',
} as const

export type ScanUpdateReason = keyof typeof SCAN_REASON_LABELS

type ScanDirection = 'lookup' | 'stock_in' | 'stock_out'

const isScanUpdateReason = (value: string): value is ScanUpdateReason => value in SCAN_REASON_LABELS

export const getScanReasonLabel = (value: string | null | undefined): string | null => {
  if (!value) return null
  return isScanUpdateReason(value) ? SCAN_REASON_LABELS[value] : null
}

export const inferScanReasonLabel = (params: {
  reason?: string | null
  scanType?: ScanDirection | null
  transactionType?: string | null
}) => {
  const explicitReason = getScanReasonLabel(params.reason)
  if (explicitReason) return explicitReason

  if (params.scanType === 'lookup') return SCAN_REASON_LABELS.inventory_audit
  if (params.scanType === 'stock_in' || params.transactionType === 'scan_in') return SCAN_REASON_LABELS.new_delivery
  if (params.scanType === 'stock_out' || params.transactionType === 'scan_out') return SCAN_REASON_LABELS.consumed

  return 'Scanner Update'
}

export const toSignedScanChange = (scanType: ScanDirection, quantity: number | null | undefined) => {
  const normalizedQuantity = Math.abs(quantity ?? 0)
  if (scanType === 'stock_in') return normalizedQuantity
  if (scanType === 'stock_out') return -normalizedQuantity
  return 0
}