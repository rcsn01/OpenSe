import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCompany } from '../../contexts/CompanyContext'
import { Tabs } from '../../components/Tabs'
import { getPublicImageUrl } from '../../utils'
import { ProductAttachmentsTab } from '../../components/ProductDetail/ProductAttachmentsTab'
import { ProductBatchHistoryTab } from '../../components/ProductDetail/ProductBatchHistoryTab'
import { ProductOverviewTab } from '../../components/ProductDetail/ProductOverviewTab'
import { ProductSuppliersTab } from '../../components/ProductDetail/ProductSuppliersTab'
import { useProductDetail } from '../../hooks/queries/useProducts'
import {
  Container,
  VStack,
  Spinner,
  EmptyState,
} from '@repo/ui'

export const ProductDetailPage = () => {
  const { id, tab } = useParams<{ id?: string; tab?: string }>()
  const navigate = useNavigate()
  const { companyId } = useCompany()
  const validTabs = ['overview', 'suppliers', 'batch', 'attachments'] as const
  const activeTab = validTabs.includes((tab ?? '') as (typeof validTabs)[number]) ? tab! : 'overview'

  const { data, isLoading } = useProductDetail(companyId, id ?? null)
  const product = data?.product ?? null
  const transactions = data?.transactions ?? []

  const images = useMemo(() => {
    if (!product?.image_urls?.length) return []
    return product.image_urls.map((url) => getPublicImageUrl(url))
  }, [product])

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to view details." />
  }

  if (isLoading) {
    return (
      <Container maxWidth="xl" className="py-10">
        <div className="flex items-center justify-center py-32">
          <Spinner size="lg" />
        </div>
      </Container>
    )
  }

  if (!product) {
    return <EmptyState title="Product not found" description="Check the inventory list again." />
  }

  const qrValue = product.sku || product.id

  return (
    <Container maxWidth="xl" className="py-8 pb-20">
      <VStack className="gap-8">
        {/* Tabs */}
        <Tabs
          activeTab={activeTab}
          onTabChange={(nextTab) => navigate(`/inventory/${product.id}/${nextTab}`)}
          tabs={[
            {
              id: 'overview',
              label: 'Overview',
              content: (
                <ProductOverviewTab
                  product={product}
                  transactions={transactions}
                  images={images}
                  qrValue={qrValue}
                />
              ),
            },
            {
              id: 'suppliers',
              label: 'Suppliers & POs',
              content: <ProductSuppliersTab productId={product.id} companyId={companyId} />,
            },
            {
              id: 'batch',
              label: 'Batch History',
              content: <ProductBatchHistoryTab productId={product.id} companyId={companyId} />,
            },
            {
              id: 'attachments',
              label: 'Files',
              content: <ProductAttachmentsTab productId={product.id} companyId={companyId} />,
            },
          ]}
        />
      </VStack>
    </Container>
  )
}