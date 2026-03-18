import { useMemo } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useCompany } from '../../contexts/CompanyContext'
import { Tabs } from '../../components/Tabs'
import { getPublicImageUrl, formatCurrency } from '../../utils'
import { ProductAttachmentsTab } from '../../components/ProductDetail/ProductAttachmentsTab'
import { ProductBatchHistoryTab } from '../../components/ProductDetail/ProductBatchHistoryTab'
import { ProductOverviewTab } from '../../components/ProductDetail/ProductOverviewTab'
import { ProductSuppliersTab } from '../../components/ProductDetail/ProductSuppliersTab'
import {
  Printer,
  MoreHorizontal,
  TrendingUp,
  Package,
  DollarSign,
  Pencil,
  Archive,
  Trash2,
} from 'lucide-react'
import { useProductDetail } from '../../hooks/queries/useProducts'
import {
  Container,
  VStack,
  HStack,
  Card,
  CardContent,
  Badge,
  Button,
  Breadcrumb,
  StackLayout,
  Spinner,
  EmptyState,
  Tooltip,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
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

  const financials = useMemo(() => {
    if (!product) return { margin: 0, totalValue: 0 }
    const cost = product.cost_price ?? 0
    const sell = product.selling_price ?? 0
    const margin = sell > 0 ? ((sell - cost) / sell) * 100 : 0
    const totalValue = (product.quantity_on_hand ?? 0) * cost
    return { margin, totalValue }
  }, [product])

  const stockStatus = useMemo(() => {
    if (!product) return { label: 'Unknown', variant: 'neutral' as const }
    if (product.quantity_on_hand === 0) return { label: 'Out of Stock', variant: 'destructive' as const }
    if (product.quantity_on_hand <= product.reorder_point) return { label: 'Low Stock', variant: 'warning' as const }
    return { label: 'In Stock', variant: 'success' as const }
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
        {/* Breadcrumb */}
        <Breadcrumb items={[
          { label: 'Inventory', href: '/inventory' },
          { label: product.name },
        ]} />

        {/* Header */}
        <HStack justify="between" align="start" wrap className="gap-4">
          <HStack align="start" className="gap-4">
            {images.length > 0 ? (
              <img
                src={images[0]}
                alt={product.name}
                className="h-14 w-14 rounded-xl object-cover border border-[var(--color-border)]"
              />
            ) : (
              <div className="flex h-14 w-14 items-center justify-center rounded-xl bg-[var(--color-muted)] text-[var(--color-muted-foreground)]">
                <Package size={22} />
              </div>
            )}
            <div>
              <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
              <HStack className="mt-1.5 gap-2">
                <Badge variant="outline" size="sm"><span className="font-mono">{product.sku}</span></Badge>
                <Badge variant={stockStatus.variant} size="sm">{stockStatus.label}</Badge>
              </HStack>
            </div>
          </HStack>

          <HStack className="gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(`/inventory/${product.id}/edit`)}>
              <Pencil size={14} /> Edit
            </Button>
            <Tooltip content="Print label">
              <Button variant="ghost" size="icon" onClick={() => window.print()}>
                <Printer size={16} />
              </Button>
            </Tooltip>
            <Dropdown
              trigger={
                <Button variant="ghost" size="icon">
                  <MoreHorizontal size={16} />
                </Button>
              }
              align="right"
            >
              <DropdownItem icon={<Archive size={14} />}>Archive product</DropdownItem>
              <DropdownSeparator />
              <DropdownItem icon={<Trash2 size={14} />} destructive>Delete product</DropdownItem>
            </Dropdown>
          </HStack>
        </HStack>

        {/* Key Metrics */}
        <StackLayout variant="stats">
          {/* Stock Level */}
          <Card padding="md" className={stockStatus.variant === 'warning' ? 'border-l-4 border-l-[var(--color-warning)]' : ''}>
            <CardContent>
              <HStack justify="between" className="mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Stock</span>
                <Package size={14} className="text-[var(--color-muted-foreground)]" />
              </HStack>
              <HStack align="end" className="gap-1.5">
                <span className="text-2xl font-bold leading-none">{product.quantity_on_hand}</span>
                <span className="mb-0.5 text-xs text-[var(--color-muted-foreground)]">/ {product.reorder_point} min</span>
              </HStack>
            </CardContent>
          </Card>

          {/* Pricing */}
          <Card padding="md">
            <CardContent>
              <HStack justify="between" className="mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Pricing</span>
                <DollarSign size={14} className="text-[var(--color-muted-foreground)]" />
              </HStack>
              <VStack className="gap-1">
                <HStack justify="between">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Cost</span>
                  <span className="text-sm font-medium">{formatCurrency(product.cost_price)}</span>
                </HStack>
                <HStack justify="between">
                  <span className="text-sm text-[var(--color-muted-foreground)]">Sell</span>
                  <span className="text-sm font-medium">{formatCurrency(product.selling_price)}</span>
                </HStack>
              </VStack>
            </CardContent>
          </Card>

          {/* Margin */}
          <Card padding="md">
            <CardContent>
              <HStack justify="between" className="mb-2">
                <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Margin</span>
                <TrendingUp size={14} className="text-[var(--color-muted-foreground)]" />
              </HStack>
              <span className={`text-2xl font-bold leading-none ${financials.margin > 30 ? 'text-[var(--color-success)]' : ''}`}>
                {financials.margin.toFixed(1)}%
              </span>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">
                {formatCurrency((product.selling_price ?? 0) - (product.cost_price ?? 0))} per unit
              </p>
            </CardContent>
          </Card>

          {/* Asset Value */}
          <Card padding="md">
            <CardContent>
              <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Asset Value</span>
              <p className="mt-2 text-2xl font-bold leading-none">{formatCurrency(financials.totalValue)}</p>
              <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Total cost basis</p>
            </CardContent>
          </Card>
        </StackLayout>

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