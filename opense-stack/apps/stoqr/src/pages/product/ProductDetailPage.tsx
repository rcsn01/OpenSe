import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCompany } from '../../contexts/CompanyContext'
import { BasePage } from '../../components/BasePage'
import { Tabs } from '../../components/Tabs'
import { getPublicImageUrl } from '../../utils'
import { ProductAttachmentsTab } from '../../components/ProductDetail/ProductAttachmentsTab'
import { ProductBatchHistoryTab } from '../../components/ProductDetail/ProductBatchHistoryTab'
import { ProductOverviewTab } from '../../components/ProductDetail/ProductOverviewTab'
import { ProductSuppliersTab } from '../../components/ProductDetail/ProductSuppliersTab'
import { useProductDetail } from '../../hooks/queries/useProducts'
import { EmptyState } from '@repo/ui'

export const ProductDetailPage = () => {
  const { id, tab } = useParams<{ id?: string; tab?: string }>()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  const validTabs = ['overview', 'suppliers', 'batch', 'attachments'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'overview'

  const { data, isLoading } = useProductDetail(companyId, id ?? null)
  const product = data?.product ?? null
  const transactions = data?.transactions ?? []
  const selectedCompanyId = companyId ?? ''

  const images = useMemo(() => {
    if (!product?.image_urls?.length) return []
    return product.image_urls.map((url) => getPublicImageUrl(url))
  }, [product])

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      loadingMessage="Loading product..."
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to view details."
    >
      <div className="stack" style={{ width: '100%', maxWidth: 1280, margin: '0 auto', paddingBottom: 80 }}>
        {product ? (
          <Tabs
            activeTab={activeTab}
            onTabChange={(nextTab) => navigate(`/inventory/${product.id}/${nextTab}`)}
            bottomSpacing
            tabs={[
              {
                id: 'overview',
                label: 'Overview',
                content: (
                  <ProductOverviewTab
                    product={product}
                    transactions={transactions}
                    images={images}
                    qrValue={product.id}
                  />
                ),
              },
              {
                id: 'suppliers',
                label: 'Suppliers & POs',
                content: <ProductSuppliersTab productId={product.id} companyId={selectedCompanyId} />,
              },
              {
                id: 'batch',
                label: 'Batch History',
                content: <ProductBatchHistoryTab productId={product.id} companyId={selectedCompanyId} />,
              },
              {
                id: 'attachments',
                label: 'Files',
                content: <ProductAttachmentsTab productId={product.id} companyId={selectedCompanyId} />,
              },
            ]}
          />
        ) : (
          <EmptyState title="Product not found" description="Check the inventory list again." />
        )}
      </div>
    </BasePage>
  )
}
