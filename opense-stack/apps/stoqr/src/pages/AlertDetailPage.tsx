import { useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  ArrowLeft,
  CheckCheck,
  Clock,
  PackagePlus,
  ShoppingCart,
  SlidersHorizontal,
} from "lucide-react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
  EmptyState,
} from "@repo/ui";
import { BasePage } from "../components/BasePage";
import { PageAvailabilityGuard } from "../components/PageAvailabilityGuard";
import { useCompany } from "../contexts/CompanyContext";
import { useAlertEvents, useUpdateAlertEventStatus } from "../hooks/queries/useAlerts";
import { useProductDetail } from "../hooks/queries/useProducts";
import type { AlertEvent } from "../api/alerts";

const severityVariant = {
  low: "secondary",
  medium: "info",
  high: "warning",
  critical: "destructive",
} as const;

const severityLabel = {
  low: "Low",
  medium: "Medium",
  high: "High",
  critical: "Critical",
} as const;

const alertTypeLabel: Record<AlertEvent["alert_type"], string> = {
  low_stock: "Low Stock",
  reorder_point: "Reorder Point",
  expiration: "Expiration",
  custom: "Custom",
};

const statusLabel: Record<AlertEvent["status"], string> = {
  open: "Open",
  acknowledged: "Acknowledged",
  resolved: "Resolved",
};

const formatDateTime = (value: string) =>
  new Intl.DateTimeFormat(undefined, {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));

export const AlertDetailPage = () => {
  const { eventId } = useParams<{ eventId?: string }>();
  const navigate = useNavigate();
  const { companyId } = useCompany();
  const { data: events = [], isLoading } = useAlertEvents(companyId);
  const updateEventStatusMutation = useUpdateAlertEventStatus(companyId);
  const event = events.find((item) => item.id === eventId) ?? null;
  const { data: productData } = useProductDetail(companyId, event?.product_id ?? null);
  const product = productData?.product ?? null;
  const recentTransactions = productData?.transactions.slice(0, 5) ?? [];
  const [message, setMessage] = useState<string | null>(null);

  const productSummary = useMemo(() => {
    if (product) {
      return {
        name: product.name,
        sku: product.sku || "No SKU",
        quantity: product.quantity_on_hand,
        reorderPoint: product.reorder_point,
      };
    }

    return {
      name: event?.products?.name ?? "No linked product",
      sku: event?.products?.sku ?? "No SKU",
      quantity: null,
      reorderPoint: null,
    };
  }, [event?.products?.name, event?.products?.sku, product]);

  const handleStatusChange = async (status: AlertEvent["status"], successMessage: string) => {
    if (!event) return;

    try {
      setMessage(null);
      await updateEventStatusMutation.mutateAsync({ eventId: event.id, status });
      setMessage(successMessage);
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Failed to update alert.");
    }
  };

  return (
    <BasePage
      companyId={companyId}
      isLoading={isLoading}
      loadingMessage="Loading alert..."
      emptyStateTitle="No company selected"
      emptyStateDescription="Choose a company to view alerts."
      contentClassName="flex h-full min-h-0 overflow-hidden px-2 pb-8 pt-[18px]"
      containerClassName="flex h-full min-h-0 min-w-0 flex-1 flex-col gap-6 overflow-hidden text-[var(--color-foreground)]"
    >
      <PageAvailabilityGuard companyId={companyId} feature="alerts">
        {!event ? (
          <EmptyState title="Alert not found" description="Return to the alert feed and choose another alert." />
        ) : (
          <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-hidden">
            <header className="flex shrink-0 flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div className="min-w-0">
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="mb-4 w-fit px-0 text-[var(--color-muted-foreground)] hover:bg-transparent hover:text-[var(--color-foreground)]"
                  onClick={() => navigate("/alerts/feed")}
                >
                  <ArrowLeft size={15} />
                  Back to Alerts
                </Button>
                <div className="mb-3 flex flex-wrap items-center gap-2">
                  <Badge variant={severityVariant[event.severity]}>{severityLabel[event.severity]}</Badge>
                  <Badge variant={event.status === "open" ? "success" : "secondary"}>{statusLabel[event.status]}</Badge>
                  <Badge variant="outline">{alertTypeLabel[event.alert_type]}</Badge>
                </div>
                <h1 className="m-0 text-3xl font-semibold leading-tight tracking-normal text-[var(--color-foreground)]">
                  {event.message}
                </h1>
                <p className="m-0 mt-2 text-sm text-[var(--color-muted-foreground)]">
                  Triggered {formatDateTime(event.triggered_at)}
                </p>
              </div>
            </header>

            {message ? (
              <div className="shrink-0 rounded-lg bg-[var(--color-surface-subtle)] px-3 py-2 text-sm text-[var(--color-foreground)]">
                {message}
              </div>
            ) : null}

            <div className="grid min-h-0 flex-1 gap-5 overflow-hidden xl:grid-cols-[minmax(0,1fr)_minmax(360px,0.42fr)]">
              <div className="flex min-h-0 flex-col gap-5 overflow-y-auto">
                <Card padding="lg">
                  <CardHeader>
                    <CardTitle>Product Context</CardTitle>
                    <CardDescription>Review stock position before choosing an action.</CardDescription>
                  </CardHeader>
                  <CardContent className="grid gap-4 md:grid-cols-4">
                    <div>
                      <p className="m-0 text-xs text-[var(--color-muted-foreground)]">Product</p>
                      <p className="m-0 mt-1 font-semibold text-[var(--color-foreground)]">{productSummary.name}</p>
                    </div>
                    <div>
                      <p className="m-0 text-xs text-[var(--color-muted-foreground)]">SKU</p>
                      <p className="m-0 mt-1 font-semibold text-[var(--color-foreground)]">{productSummary.sku}</p>
                    </div>
                    <div>
                      <p className="m-0 text-xs text-[var(--color-muted-foreground)]">Current Stock</p>
                      <p className="m-0 mt-1 font-semibold text-[var(--color-foreground)]">
                        {productSummary.quantity ?? "Unknown"}
                      </p>
                    </div>
                    <div>
                      <p className="m-0 text-xs text-[var(--color-muted-foreground)]">Low Stock Alert</p>
                      <p className="m-0 mt-1 font-semibold text-[var(--color-foreground)]">
                        {productSummary.reorderPoint ?? "Unknown"}
                      </p>
                    </div>
                  </CardContent>
                </Card>

                <Card padding="lg" className="min-h-0">
                  <CardHeader>
                    <CardTitle>Recent Stock Movement</CardTitle>
                    <CardDescription>Latest product transactions for context.</CardDescription>
                  </CardHeader>
                  <CardContent>
                    {recentTransactions.length ? (
                      <div className="grid gap-3">
                        {recentTransactions.map((transaction) => (
                          <div
                            key={transaction.id}
                            className="grid gap-3 rounded-[var(--radius-md)] bg-[var(--color-background)] px-3 py-2 text-sm md:grid-cols-[160px_1fr_120px]"
                          >
                            <span className="text-[var(--color-muted-foreground)]">
                              {formatDateTime(transaction.created_at)}
                            </span>
                            <span className="font-medium text-[var(--color-foreground)]">
                              {transaction.notes || transaction.transaction_type}
                            </span>
                            <span className="text-[var(--color-muted-foreground)]">
                              {transaction.quantity_change > 0 ? "+" : ""}
                              {transaction.quantity_change}
                              {transaction.stock_after !== null ? ` -> ${transaction.stock_after}` : ""}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="m-0 text-sm text-[var(--color-muted-foreground)]">
                        No recent stock movement is available for this alert.
                      </p>
                    )}
                  </CardContent>
                </Card>
              </div>

              <Card padding="lg" className="min-h-0 overflow-y-auto">
                <CardHeader>
                  <CardTitle>Actions</CardTitle>
                  <CardDescription>Move this alert into the next operational step.</CardDescription>
                </CardHeader>
                <CardContent className="grid gap-3">
                  <Button
                    type="button"
                    className="justify-start"
                    onClick={() => navigate(`/procurement/purchase-orders?alert=${event.id}${event.product_id ? `&product=${event.product_id}` : ""}`)}
                  >
                    <ShoppingCart size={16} />
                    Create Purchase Order
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    onClick={() => navigate(`/procurement/purchase-orders?attachAlert=${event.id}${event.product_id ? `&product=${event.product_id}` : ""}`)}
                  >
                    <PackagePlus size={16} />
                    Add to Existing Purchase Order
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    disabled={!event.product_id}
                    onClick={() => navigate(`/inventory/${event.product_id}/adjust?returnTo=/alerts/feed/${event.id}`)}
                  >
                    <SlidersHorizontal size={16} />
                    Adjust Stock
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    disabled={updateEventStatusMutation.isPending || event.status === "acknowledged"}
                    onClick={() => void handleStatusChange("acknowledged", "Alert snoozed.")}
                  >
                    <Clock size={16} />
                    Snooze
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    className="justify-start"
                    disabled={updateEventStatusMutation.isPending || event.status === "acknowledged"}
                    onClick={() => void handleStatusChange("acknowledged", "Alert acknowledged.")}
                  >
                    <CheckCheck size={16} />
                    Acknowledge
                  </Button>
                  <Button
                    type="button"
                    variant="outline"
                    className="justify-start"
                    disabled={updateEventStatusMutation.isPending || event.status === "resolved"}
                    onClick={() => void handleStatusChange("resolved", "Alert resolved.")}
                  >
                    Resolve
                  </Button>
                </CardContent>
              </Card>
            </div>
          </div>
        )}
      </PageAvailabilityGuard>
    </BasePage>
  );
};
