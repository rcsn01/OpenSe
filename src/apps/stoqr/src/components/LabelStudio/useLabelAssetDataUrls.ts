import { useEffect, useMemo, useState } from 'react'

import { defaultLabelAssetRenderers, resolveLabelAssetDataUrls, type LabelAssetRenderers } from './labelAssetRenderers'
import type { LabelAssetRenderItem } from './labelRenderPlan'

export const useLabelAssetDataUrls = (
  assets: LabelAssetRenderItem[],
  renderers: LabelAssetRenderers = defaultLabelAssetRenderers,
) => {
  const [assetMap, setAssetMap] = useState<Record<string, string>>({})
  const requestKey = useMemo(
    () => assets.map((asset) => asset.key).sort().join('|'),
    [assets],
  )

  useEffect(() => {
    let cancelled = false

    if (assets.length === 0) {
      setAssetMap({})
      return () => {
        cancelled = true
      }
    }

    resolveLabelAssetDataUrls(assets, renderers)
      .then((nextAssetMap) => {
        if (!cancelled) {
          setAssetMap(nextAssetMap)
        }
      })
      .catch(() => {
        if (!cancelled) {
          setAssetMap({})
        }
      })

    return () => {
      cancelled = true
    }
  }, [assets, renderers, requestKey])

  return assetMap
}