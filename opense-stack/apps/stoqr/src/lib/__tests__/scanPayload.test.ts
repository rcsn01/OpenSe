import { describe, expect, it } from 'vitest'

import { buildProductLocationScanPayload, parseScanPayload } from '../scanPayload'

describe('scan payload helpers', () => {
  it('parses legacy product QR values as product-only payloads', () => {
    expect(parseScanPayload(' product-1 ')).toEqual({
      kind: 'product',
      productId: 'product-1',
      folderId: null,
    })
  })

  it('builds and parses product-location payloads', () => {
    const payload = buildProductLocationScanPayload('product-1', 'folder-1')

    expect(payload).toBe('stoqr:v1:product:product-1:folder:folder-1')
    expect(parseScanPayload(payload)).toEqual({
      kind: 'product-location',
      productId: 'product-1',
      folderId: 'folder-1',
    })
  })

  it('treats malformed stoqr payloads as unsupported', () => {
    expect(parseScanPayload('stoqr:v1:product:product-1')).toEqual({
      kind: 'unsupported',
      value: 'stoqr:v1:product:product-1',
    })
    expect(parseScanPayload('stoqr:v1:product::folder:folder-1')).toEqual({
      kind: 'unsupported',
      value: 'stoqr:v1:product::folder:folder-1',
    })
  })

  it('treats unsupported stoqr payload types as unsupported strings', () => {
    expect(parseScanPayload('stoqr:v1:supplier:supplier-1')).toEqual({
      kind: 'unsupported',
      value: 'stoqr:v1:supplier:supplier-1',
    })
  })
})
