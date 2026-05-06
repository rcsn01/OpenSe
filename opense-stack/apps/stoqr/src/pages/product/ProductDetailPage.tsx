import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { ArrowLeft, MapPin } from 'lucide-react'
import { EmptyState } from '@repo/ui'

import { useCompany } from '../../contexts/CompanyContext'
import { BasePage } from '../../components/BasePage'
import { getPublicImageUrl } from '../../utils'
import { ProductAttachmentsTab } from '../../components/ProductDetail/ProductAttachmentsTab'
import { ProductBatchHistoryTab } from '../../components/ProductDetail/ProductBatchHistoryTab'
import { ProductOverviewTab } from '../../components/ProductDetail/ProductOverviewTab'
import { ProductSuppliersTab } from '../../components/ProductDetail/ProductSuppliersTab'
import { useProductPageSearch } from '../../hooks/useProductPageSearch'
import { useProductDetail, useProductFolders } from '../../hooks/queries/useProducts'

const PRODUCT_DETAIL_TABS = [
  { id: 'overview', label: 'Overview' },
  { id: 'suppliers', label: 'Suppliers' },
  { id: 'history', label: 'History' },
  { id: 'attachments', label: 'Files' },
] as const

const buildFolderPathLabel = (
  folderId: string,
  folderMap: Map<string, { id: string; name: string; parent_id: string | null }>,
) => {
  const labels: string[] = []
  let currentFolder = folderMap.get(folderId)

  while (currentFolder) {
    labels.unshift(currentFolder.name)
    currentFolder = currentFolder.parent_id ? folderMap.get(currentFolder.parent_id) : undefined
  }

  return labels.join(' / ')
}

export const ProductDetailPage = () => {
  const { id, tab } = useParams<{ id?: string; tab?: string }>()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  useProductPageSearch(companyId)
  const { data: folders = [] } = useProductFolders(companyId)
  const validTabs = PRODUCT_DETAIL_TABS.map((item) => item.id)
  const requestedTab = tab === 'batch' ? 'history' : tab
  const activeTab = validTabs.includes((requestedTab ?? '') as (typeof validTabs)[number]) ? requestedTab! : 'overview'

  const { data, isLoading } = useProductDetail(companyId, id ?? null)
  const product = data?.product ?? null
  const transactions = data?.transactions ?? []
  const selectedCompanyId = companyId ?? ''

  const images = useMemo(() => {
    if (!product?.image_urls?.length) return []
    return product.image_urls.map((url) => getPublicImageUrl(url))
  }, [product])

  const locationLabel = useMemo(() => {
    if (!product?.folder_id) return 'Unassigned location'

    const folderMap = new Map(folders.map((folder) => [folder.id, folder]))
    return buildFolderPathLabel(product.folder_id, folderMap)
  }, [folders, product?.folder_id])

  const renderTabContent = () => {
    if (!product) return null

    if (activeTab === 'overview') {
      return (
        <ProductOverviewTab
          product={product}
          transactions={transactions}
          images={images}
          qrValue={product.id}
        />
      )
    }

    if (activeTab === 'suppliers') {
      return <ProductSuppliersTab productId={product.id} companyId={selectedCompanyId} productSku={product.sku} />
    }

    if (activeTab === 'history') {
      return <ProductBatchHistoryTab transactions={transactions} />
    }

    return <ProductAttachmentsTab productId={product.id} companyId={selectedCompanyId} />
  }

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      loadingMessage="Loading product..."
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to view details."
    >
      <div className="product-detail-page">
        {product ? (
          <>
            <div className="product-detail-topbar">
              <button
                type="button"
                className="product-detail-link"
                onClick={() => navigate('/inventory/all')}
              >
                <ArrowLeft size={14} />
                Back to Inventory
              </button>

              <button
                type="button"
                className="product-detail-link product-detail-link--strong"
                onClick={() => navigate(`/inventory/${product.id}/edit`)}
              >
                Edit Product
              </button>
            </div>

            <header className="product-detail-heading">
              <h1 className="product-detail-title">{product.name}</h1>
              <div className="product-detail-meta">
                <span className="product-detail-meta-item">{product.sku || 'No SKU assigned'}</span>
                <span className="product-detail-meta-separator" aria-hidden="true" />
                <span className="product-detail-meta-item product-detail-meta-item--location">
                  <MapPin size={13} />
                  {locationLabel}
                </span>
              </div>
            </header>

            <div className="product-detail-nav" role="tablist" aria-label="Product sections">
              {PRODUCT_DETAIL_TABS.map((detailTab) => (
                <button
                  key={detailTab.id}
                  type="button"
                  role="tab"
                  aria-selected={activeTab === detailTab.id}
                  className={`product-detail-nav-button${activeTab === detailTab.id ? ' is-active' : ''}`}
                  onClick={() => navigate(`/inventory/${product.id}/${detailTab.id}`)}
                >
                  {detailTab.label}
                </button>
              ))}
            </div>

            {activeTab === 'overview' ? (
              renderTabContent()
            ) : (
              <div className="product-detail-panel">{renderTabContent()}</div>
            )}
          </>
        ) : (
          <EmptyState title="Product not found" description="Check the inventory list again." />
        )}
      </div>
    </BasePage>
  )
}
