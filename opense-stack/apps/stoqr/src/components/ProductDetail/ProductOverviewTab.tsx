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
} from '@repo/ui'
import { formatCurrency, formatDateTime } from '../../utils'
import type { InventoryTransaction, Product } from '../../types'

const StockStatusBadge = ({ quantity, reorderPoint }: { quantity: number; reorderPoint: number }) => {
  if (quantity === 0) return <Badge variant="destructive">Out of stock</Badge>
  if (quantity <= reorderPoint) return <Badge variant="warning">Low stock</Badge>
  return <Badge variant="success">In stock</Badge>
}

const MetricCard = ({ label, value, sub }: { label: string; value: string | number; sub?: string }) => (
  <div className="flex flex-col gap-0.5 rounded-xl border border-[var(--color-border)] bg-[var(--color-muted)] px-4 py-3">
    <span className="text-xs font-medium text-[var(--color-muted-foreground)]">{label}</span>
    <span className="text-lg font-semibold text-[var(--color-foreground)]">{value}</span>
    {sub && <span className="text-xs text-[var(--color-muted-foreground)]">{sub}</span>}
  </div>
)

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
  const customFields = product.custom_fields ?? {}
  const recentTransactions = transactions.slice(0, 8)
  const stockRatio = product.reorder_point > 0 ? product.quantity_on_hand / product.reorder_point : 1

  return (
    <div className="flex flex-col gap-6">
      {/* ── Header ── */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex flex-col gap-1">
          <div className="flex items-center gap-3">
            <h2 className="text-2xl font-bold tracking-tight text-[var(--color-foreground)]">{product.name}</h2>
            <StockStatusBadge quantity={product.quantity_on_hand} reorderPoint={product.reorder_point} />
          </div>
          <span className="font-mono text-sm text-[var(--color-muted-foreground)]">SKU {product.sku}</span>
        </div>
        <div className="flex items-center gap-2">
          <Tooltip content="Copy SKU to clipboard" side="bottom">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(product.sku)}>
              Copy SKU
            </Button>
          </Tooltip>
          <Tooltip content="Copy QR payload to clipboard" side="bottom">
            <Button variant="outline" size="sm" onClick={() => navigator.clipboard.writeText(qrValue)}>
              Copy QR
            </Button>
          </Tooltip>
        </div>
      </div>

      {/* ── Key Metrics ── */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5">
        <MetricCard
          label="On Hand"
          value={product.quantity_on_hand}
          sub={stockRatio <= 1 ? 'Below reorder point' : undefined}
        />
        <MetricCard label="Reorder Point" value={product.reorder_point} />
        <MetricCard label="Cost Price" value={formatCurrency(product.cost_price)} />
        <MetricCard label="Selling Price" value={formatCurrency(product.selling_price)} />
        {product.expiry_date && <MetricCard label="Expiry" value={product.expiry_date} />}
      </div>

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
