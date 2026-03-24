import { useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
  Badge,
  Button,
  EmptyState,
  Tooltip,
  Table,
  TableHeader,
  TableBody,
  TableRow,
  TableHead,
  TableCell,
  HStack,
  VStack,
  StackLayout,
  Breadcrumb,
  Dropdown,
  DropdownItem,
  DropdownSeparator,
} from '@repo/ui'
import {
  Package,
  DollarSign,
  TrendingUp,
  Pencil,
  Printer,
  MoreHorizontal,
  Archive,
  Trash2,
} from 'lucide-react'
import { formatCurrency, formatDateTime } from '../../utils'
import type { InventoryTransaction, Product } from '../../types'
import { useCompany } from '../../contexts/CompanyContext'
import { useProductFolders } from '../../hooks/queries/useProducts'

export const ProductOverviewTab = ({
  product,
  transactions,
  images,
  qrValue,
}: {
  product: Product
  transactions: InventoryTransaction[]
  images: string[]
  qrValue: string
}) => {
  const navigate = useNavigate()
  const { companyId } = useCompany()
  const { data: allFolders = [] } = useProductFolders(companyId)
  const customFields = product.custom_fields ?? {}
  const recentTransactions = transactions.slice(0, 8)

  const folderPath = useMemo(() => {
    if (!product.folder_id) return []
    const folderMap = new Map(allFolders.map((f) => [f.id, f]))
    const path: { id: string; name: string }[] = []
    let current = folderMap.get(product.folder_id)
    while (current) {
      path.unshift({ id: current.id, name: current.name })
      current = current.parent_id ? folderMap.get(current.parent_id) : undefined
    }
    return path
  }, [product.folder_id, allFolders])

  const breadcrumbItems = useMemo(() => [
    { label: 'Inventory', href: '/inventory' },
    ...folderPath.map((f) => ({ label: f.name })),
    { label: product.name },
  ], [folderPath, product.name])

  const stockStatus = useMemo(() => {
    if (product.quantity_on_hand === 0) return { label: 'Out of Stock', variant: 'destructive' as const }
    if (product.quantity_on_hand <= product.reorder_point) return { label: 'Low Stock', variant: 'warning' as const }
    return { label: 'In Stock', variant: 'success' as const }
  }, [product.quantity_on_hand, product.reorder_point])

  const financials = useMemo(() => {
    const cost = product.cost_price ?? 0
    const sell = product.selling_price ?? 0
    const margin = sell > 0 ? ((sell - cost) / sell) * 100 : 0
    const totalValue = (product.quantity_on_hand ?? 0) * cost
    return { margin, totalValue }
  }, [product.cost_price, product.selling_price, product.quantity_on_hand])

  return (
    <div className="flex flex-col gap-6 pt-6">
      {/* ── Header ── */}
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
            <Breadcrumb items={breadcrumbItems} className="mb-1" />
            <h1 className="text-2xl font-semibold tracking-tight">{product.name}</h1>
            <HStack className="mt-1.5 gap-2">
              <Badge variant="outline" size="sm"><span className="type-mono">{product.sku}</span></Badge>
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

      {/* ── Key Metrics ── */}
      <StackLayout variant="stats">
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
        <Card padding="md">
          <CardContent>
            <span className="text-xs font-medium uppercase tracking-wide text-[var(--color-muted-foreground)]">Asset Value</span>
            <p className="mt-2 text-2xl font-bold leading-none">{formatCurrency(financials.totalValue)}</p>
            <p className="mt-1 text-xs text-[var(--color-muted-foreground)]">Total cost basis</p>
          </CardContent>
        </Card>
      </StackLayout>

      {/* ── Main Content Grid ── */}
      <div className="grid gap-6 lg:grid-cols-[1fr_340px]">
        {/* Left Column */}
        <div className="flex flex-col gap-6">
          {/* Description */}
          {product.description && (
            <Card>
              <CardHeader><CardTitle>Description</CardTitle></CardHeader>
              <CardContent>
                <p className="text-sm leading-relaxed text-[var(--color-muted-foreground)]">{product.description}</p>
              </CardContent>
            </Card>
          )}

          {/* Custom Fields */}
          <Card>
            <CardHeader><CardTitle>Custom Fields</CardTitle></CardHeader>
            <CardContent>
              {Object.keys(customFields).length === 0 ? (
                <EmptyState title="No custom fields" description="Add values in product settings." />
              ) : (
                <div className="flex flex-col gap-2">
                  {Object.entries(customFields).map(([key, value]) => (
                    <div key={key} className="flex items-center justify-between gap-4 border-b border-[var(--color-border)] pb-2 last:border-0 last:pb-0">
                      <span className="text-sm text-[var(--color-muted-foreground)]">{key}</span>
                      <span className="text-sm font-semibold text-[var(--color-foreground)]">{String(value)}</span>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader><CardTitle>Recent Activity</CardTitle></CardHeader>
            <CardContent>
              {recentTransactions.length === 0 ? (
                <EmptyState title="No activity" description="Transactions for this product appear here." />
              ) : (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Type</TableHead>
                        <TableHead>Change</TableHead>
                        <TableHead>After</TableHead>
                        <TableHead>By</TableHead>
                        <TableHead>Date</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {recentTransactions.map((tx) => (
                        <TableRow key={tx.id}>
                          <TableCell className="font-medium">{tx.transaction_type}</TableCell>
                          <TableCell>
                            <Badge variant={tx.quantity_change > 0 ? 'success' : 'destructive'} size="sm">
                              {tx.quantity_change > 0 ? '+' : ''}{tx.quantity_change}
                            </Badge>
                          </TableCell>
                          <TableCell>{tx.stock_after ?? '—'}</TableCell>
                          <TableCell className="text-[var(--color-muted-foreground)]">
                            {tx.profiles?.full_name ?? tx.profiles?.username ?? 'Unknown'}
                          </TableCell>
                          <TableCell className="text-[var(--color-muted-foreground)]">
                            {formatDateTime(tx.created_at)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Right Column */}
        <div className="flex flex-col gap-6">
          {/* Images */}
          <Card>
            <CardHeader><CardTitle>Photos</CardTitle></CardHeader>
            <CardContent>
              {images.length === 0 ? (
                <EmptyState title="No images" description="Upload images to the product." />
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {images.map((url) => (
                    <img
                      key={url}
                      src={url}
                      alt={product.name}
                      className="aspect-square w-full rounded-lg border border-[var(--color-border)] object-cover"
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          {/* QR Code */}
          <Card>
            <CardHeader><CardTitle>QR Code</CardTitle></CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-3">
                <img
                  src={`https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=${encodeURIComponent(qrValue)}`}
                  alt="QR Code"
                  width={160}
                  height={160}
                  className="rounded-xl border border-[var(--color-border)]"
                />
                <code className="max-w-full break-all rounded-md bg-[var(--color-muted)] px-3 py-1.5 text-xs text-[var(--color-muted-foreground)]">
                  {qrValue}
                </code>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
