type ScanDirection = 'lookup' | 'stock_in' | 'stock_out'

export const inferScanMovementLabel = (params: {
  scanType?: ScanDirection | null
  transactionType?: string | null
}) => {
  if (params.scanType === 'stock_in' || params.transactionType === 'scan_in') return 'Stock In'
  if (params.scanType === 'stock_out' || params.transactionType === 'scan_out') return 'Stock Out'
  if (params.scanType === 'lookup' || params.transactionType === 'lookup') return 'Lookup'

  return 'Lookup'
}

export const toSignedScanChange = (scanType: ScanDirection, quantity: number | null | undefined) => {
  const normalizedQuantity = Math.abs(quantity ?? 0)
  if (scanType === 'stock_in') return normalizedQuantity
  if (scanType === 'stock_out') return -normalizedQuantity
  return 0
}
