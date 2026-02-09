import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { supabase } from '../../supabaseClient'
import { useCompany } from '../../contexts/CompanyContext'
import type { InventoryTransaction, Product } from '../../types'
import { EmptyState } from '../../components/EmptyState'
import { Tabs } from '../../components/Tabs'
import { getPublicImageUrl } from '../../utils'
import { ProductAttachmentsTab } from '../../components/ProductDetail/ProductAttachmentsTab'
import { ProductBatchHistoryTab } from '../../components/ProductDetail/ProductBatchHistoryTab'
import { ProductOverviewTab } from '../../components/ProductDetail/ProductOverviewTab'
import { ProductSuppliersTab } from '../../components/ProductDetail/ProductSuppliersTab'

export const ProductDetail = () => {
  const { id } = useParams()
  const { companyId } = useCompany()
  const [product, setProduct] = useState<Product | null>(null)
  const [transactions, setTransactions] = useState<InventoryTransaction[]>([])
  const [isLoading, setIsLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      if (!companyId || !id) return
      setIsLoading(true)

      const { data: productData, error: productError } = await supabase
        .from('products')
        .select(
          'id, name, sku, description, category, quantity_on_hand, reorder_point, cost_price, selling_price, folder_id, image_urls, custom_fields, expiry_date',
        )
        .eq('company_id', companyId)
        .eq('id', id)
        .single()

      if (productError) {
        console.error(productError)
        setProduct(null)
      } else {
        setProduct(productData as Product)
      }

      const { data: transactionData } = await supabase
        .from('inventory_transactions')
        .select(
          'id, transaction_type, quantity_change, stock_after, created_at, notes, profiles (id, full_name, username) ',
        )
        .eq('company_id', companyId)
        .eq('product_id', id)
        .order('created_at', { ascending: false })

      const normalized = ((transactionData as any[]) ?? []).map((item) => ({
        ...item,
        profiles: Array.isArray(item.profiles) ? item.profiles[0] : item.profiles,
      }))
      setTransactions(normalized as InventoryTransaction[])
      setIsLoading(false)
    }

    load()
  }, [companyId, id])

  const images = useMemo(() => {
    if (!product?.image_urls?.length) return []
    return product.image_urls.map((url) => getPublicImageUrl(url))
  }, [product])

  if (!companyId) {
    return <EmptyState title="No company selected" description="Choose a company to view details." />
  }

  if (isLoading) {
    return <div className="empty-state">Loading product...</div>
  }

  if (!product) {
    return <EmptyState title="Product not found" description="Check the inventory list again." />
  }

  const qrValue = product.sku || product.id

  return (
    <div className="stack">
      <div className="flex-between" style={{ marginBottom: 8 }}>
        <h1 className="page-title" style={{ fontSize: 24, marginBottom: 0 }}>Product Details</h1>
      </div>

      <Tabs
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
            label: 'Suppliers',
            content: <ProductSuppliersTab productId={product.id} companyId={companyId} />,
          },
          {
            id: 'batch',
            label: 'Batch History',
            content: <ProductBatchHistoryTab productId={product.id} companyId={companyId} />,
          },
          {
            id: 'attachments',
            label: 'Attachments',
            content: <ProductAttachmentsTab productId={product.id} companyId={companyId} />,
          },
        ]}
      />
    </div>
  )
}