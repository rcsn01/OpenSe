export type ParsedScanPayload =
  | { kind: 'product'; productId: string; folderId: null }
  | { kind: 'product-location'; productId: string; folderId: string }
  | { kind: 'unsupported'; value: string }

const PRODUCT_LOCATION_PREFIX = 'stoqr:v1:product:'

const hasPayloadPart = (value: string) => value.trim().length > 0 && !value.includes(':')

export const buildProductLocationScanPayload = (productId: string, folderId: string) => (
  `${PRODUCT_LOCATION_PREFIX}${productId}:folder:${folderId}`
)

export const parseScanPayload = (scanValue: string): ParsedScanPayload => {
  const value = scanValue.trim()

  if (!value) {
    return { kind: 'unsupported', value }
  }

  if (!value.startsWith('stoqr:')) {
    return { kind: 'product', productId: value, folderId: null }
  }

  if (!value.startsWith(PRODUCT_LOCATION_PREFIX)) {
    return { kind: 'unsupported', value }
  }

  const rest = value.slice(PRODUCT_LOCATION_PREFIX.length)
  const parts = rest.split(':')

  if (
    parts.length !== 3 ||
    parts[1] !== 'folder' ||
    !hasPayloadPart(parts[0]) ||
    !hasPayloadPart(parts[2])
  ) {
    return { kind: 'unsupported', value }
  }

  return { kind: 'product-location', productId: parts[0], folderId: parts[2] }
}
