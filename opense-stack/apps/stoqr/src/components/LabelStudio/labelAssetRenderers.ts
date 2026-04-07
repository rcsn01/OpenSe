import JsBarcode from 'jsbarcode'
import QRCode from 'qrcode'

import type { LabelAssetRenderItem } from './labelRenderPlan'

export type LabelAssetRenderers = {
  renderQrDataUrl: (value: string, size: number) => Promise<string>
  renderBarcodeDataUrl: (value: string, width: number, height: number) => Promise<string>
}

const isJsDomEnvironment = () => typeof navigator !== 'undefined' && /jsdom/i.test(navigator.userAgent)

const renderBarcodeSvgDataUrl = (value: string, width: number, height: number) => {
  if (typeof document === 'undefined') {
    throw new Error('Barcode rendering requires a browser-like environment.')
  }

  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg')
  JsBarcode(svg, value, {
    format: 'CODE128',
    displayValue: false,
    margin: 0,
    width: Math.max(1, Math.floor(width / 80)),
    height: Math.max(24, Math.floor(height)),
  })

  const xml = new XMLSerializer().serializeToString(svg)
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(xml)}`
}

export const defaultLabelAssetRenderers: LabelAssetRenderers = {
  renderQrDataUrl: (value, size) =>
    QRCode.toDataURL(value, {
      width: Math.max(64, Math.floor(size)),
      margin: 1,
      errorCorrectionLevel: 'M',
    }),
  renderBarcodeDataUrl: async (value, width, height) => {
    if (typeof document === 'undefined') {
      throw new Error('Barcode rendering requires a browser-like environment.')
    }

    if (isJsDomEnvironment()) {
      return renderBarcodeSvgDataUrl(value, width, height)
    }

    const canvas = document.createElement('canvas')
    const context = typeof canvas.getContext === 'function' ? canvas.getContext('2d') : null

    if (!context) {
      return renderBarcodeSvgDataUrl(value, width, height)
    }

    JsBarcode(canvas, value, {
      format: 'CODE128',
      displayValue: false,
      margin: 0,
      width: Math.max(1, Math.floor(width / 80)),
      height: Math.max(24, Math.floor(height)),
    })

    return canvas.toDataURL('image/png')
  },
}

export const getLabelAssetCacheKey = (asset: Pick<LabelAssetRenderItem, 'key'>) => asset.key

export const resolveLabelAssetDataUrls = async (
  assets: LabelAssetRenderItem[],
  renderers: LabelAssetRenderers = defaultLabelAssetRenderers,
) => {
  const uniqueAssets = Array.from(new Map(assets.map((asset) => [asset.key, asset])).values())
  const entries = await Promise.all(
    uniqueAssets.map(async (asset) => {
      if (asset.kind === 'qr') {
        return [asset.key, await renderers.renderQrDataUrl(asset.value, asset.width)] as const
      }

      return [asset.key, await renderers.renderBarcodeDataUrl(asset.value, asset.width, asset.height)] as const
    }),
  )

  return Object.fromEntries(entries)
}