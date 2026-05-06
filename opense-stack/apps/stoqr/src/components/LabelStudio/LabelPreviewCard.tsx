import { useEffect, useMemo, useState } from 'react'
import { Badge, Button, Card, cn } from '@repo/ui'

import type { LabelProduct } from '../../api/labelStudio'
import type { LabelAssetRenderers } from './labelAssetRenderers'
import { LabelPagePreviewSvg, SingleLabelPreviewSvg } from './LabelRenderPreview'
import { buildLabelPlacements, buildLabelRenderPlan, getPlacementPageCount, resolveLabelLayout } from './labelRenderPlan'
import { useLabelAssetDataUrls } from './useLabelAssetDataUrls'

type LabelPreviewSummaryItem = {
  label: string
  value: string
}

type LabelPreviewCardProps = {
  title: string
  description?: string
  className?: string
  templateName?: string | null
  layout?: Record<string, unknown> | null
  variableFields?: string[]
  quantity?: number
  badgeText?: string
  emptyMessage: string
  sampleProduct?: Partial<Pick<LabelProduct, 'id' | 'name' | 'sku' | 'selling_price'>> | null
  products?: LabelProduct[]
  previewMode?: 'label' | 'page'
  renderers?: LabelAssetRenderers
  summaryItems?: LabelPreviewSummaryItem[]
  hideHeader?: boolean
  showTemplateMeta?: boolean
  showVariableFields?: boolean
  showSummaryItems?: boolean
}

const defaultSample = {
  id: 'sample-id',
  name: 'Sample Product Name',
  sku: 'SKU-001',
  selling_price: 24,
  folder_id: null,
}

const formatFieldName = (value: string) => {
  const normalizedValue = value.trim().toLowerCase()

  if (normalizedValue === 'sku') return 'SKU'
  if (normalizedValue === 'qr') return 'QR'

  return normalizedValue.charAt(0).toUpperCase() + normalizedValue.slice(1)
}

export const LabelPreviewCard = ({
  title,
  description,
  className,
  templateName,
  layout,
  variableFields,
  quantity,
  badgeText,
  emptyMessage,
  sampleProduct,
  products,
  previewMode = 'label',
  renderers,
  summaryItems,
  hideHeader = false,
  showTemplateMeta = true,
  showVariableFields = true,
  showSummaryItems = true,
}: LabelPreviewCardProps) => {
  const layoutKey = JSON.stringify(layout ?? null)
  const resolvedLayout = useMemo(() => resolveLabelLayout(layout), [layoutKey, layout])
  const previewProduct = useMemo(
    () => ({
      ...defaultSample,
      ...(sampleProduct ?? {}),
    }),
    [sampleProduct],
  )
  const previewProducts = useMemo(() => products ?? [], [products])
  const singleLabelPlan = useMemo(
    () => (templateName && previewMode === 'label' ? buildLabelRenderPlan(previewProduct, resolvedLayout) : null),
    [previewMode, previewProduct, resolvedLayout, templateName],
  )
  const placements = useMemo(
    () => (templateName && previewMode === 'page' ? buildLabelPlacements(previewProducts, quantity ?? 1, resolvedLayout) : []),
    [previewMode, previewProducts, quantity, resolvedLayout, templateName],
  )
  const pageCount = useMemo(() => getPlacementPageCount(placements), [placements])
  const [pageIndex, setPageIndex] = useState(0)

  useEffect(() => {
    setPageIndex(0)
  }, [layoutKey, previewMode, quantity, templateName, previewProducts])

  useEffect(() => {
    if (pageIndex > Math.max(0, pageCount - 1)) {
      setPageIndex(Math.max(0, pageCount - 1))
    }
  }, [pageCount, pageIndex])

  const visiblePlacements = useMemo(
    () => placements.filter((placement) => placement.page === pageIndex),
    [pageIndex, placements],
  )
  const pageLabelPlans = useMemo(
    () => visiblePlacements.map((placement) => ({
      placement,
      plan: buildLabelRenderPlan(placement.product, resolvedLayout),
    })),
    [resolvedLayout, visiblePlacements],
  )
  const assetRequests = useMemo(() => {
    if (previewMode === 'page') {
      return pageLabelPlans.flatMap((item) => item.plan.assetItems)
    }

    return singleLabelPlan?.assetItems ?? []
  }, [pageLabelPlans, previewMode, singleLabelPlan])
  const assetMap = useLabelAssetDataUrls(assetRequests, renderers)
  const showPagePreview = previewMode === 'page' && templateName && pageLabelPlans.length > 0
  const showSingleLabelPreview = previewMode === 'label' && templateName && singleLabelPlan

  return (
    <Card className={cn('export-preview-card label-preview-card', className)}>
      {!hideHeader ? (
        <div className="label-preview-card-header">
          <div>
            <h3 className={cn('text-lg font-semibold text-[var(--color-foreground)]', description && 'mb-1')}>{title}</h3>
            {description ? <p className="text-sm text-[var(--color-muted-foreground)]">{description}</p> : null}
          </div>
          {badgeText ? <Badge variant="outline">{badgeText}</Badge> : null}
        </div>
      ) : null}

      {showTemplateMeta && templateName ? (
        <div className="label-preview-template-row">
          <span className="label-preview-template-chip">{templateName}</span>
          {previewMode === 'page' && pageCount > 0 ? (
            <span className="label-preview-page-status">Page {pageIndex + 1} of {pageCount}</span>
          ) : null}
        </div>
      ) : null}

      <div className={`label-preview-canvas${previewMode === 'page' ? ' is-page-preview' : ''}`}>
        {showPagePreview ? (
          <div className="label-preview-artboard is-page">
            <LabelPagePreviewSvg
              templateName={templateName}
              labels={pageLabelPlans}
              assetMap={assetMap}
            />
          </div>
        ) : showSingleLabelPreview ? (
          <div className="label-preview-artboard is-label">
            <SingleLabelPreviewSvg plan={singleLabelPlan} assetMap={assetMap} />
          </div>
        ) : (
          <div className="empty-state p-6">{emptyMessage}</div>
        )}
      </div>

      {previewMode === 'page' && pageCount > 1 ? (
        <div className="label-preview-pagination">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPageIndex((currentPage) => Math.max(0, currentPage - 1))}
            disabled={pageIndex === 0}
          >
            Previous Page
          </Button>
          <span className="label-preview-pagination-status">{pageIndex + 1} / {pageCount}</span>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setPageIndex((currentPage) => Math.min(pageCount - 1, currentPage + 1))}
            disabled={pageIndex >= pageCount - 1}
          >
            Next Page
          </Button>
        </div>
      ) : null}

      {showSummaryItems && summaryItems?.length ? (
        <div className="label-preview-meta-grid">
          {summaryItems.map((item) => (
            <div key={`${item.label}-${item.value}`} className="label-preview-meta">
              <span className="label-preview-meta-label">{item.label}</span>
              <span className="label-preview-meta-value">{item.value}</span>
            </div>
          ))}
        </div>
      ) : null}

      {showVariableFields && variableFields?.length ? (
        <div className="label-preview-variables">
          {variableFields.map((field) => (
            <span key={field} className="label-preview-variable-pill">{formatFieldName(field)}</span>
          ))}
        </div>
      ) : null}
    </Card>
  )
}
