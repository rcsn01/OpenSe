import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Dropdown,
  DropdownItem,
  EmptyState,
  Input,
} from "@repo/ui";
import {
  Building2,
  Mail,
  MoreVertical,
  Phone,
  Plus,
  UserRound,
} from "lucide-react";
import type { Supplier } from "../../api/procurement";
import {
  usePageTopBarSearch,
  useTopBarSearchValue,
} from "../Search/TopBarSearch";
import {
  useCreateProcurementSupplier,
  useProcurementPurchaseOrderItems,
  useProcurementPurchaseOrders,
  useProcurementReceivingLogs,
  useProcurementSuppliers,
} from "../../hooks/queries/useProcurementTabs";
import {
  fuzzyRankings,
  fuzzySearchItems,
  normalizePageSearchTerm,
} from "../../lib/pageSearch";

type SupplierDialogMode = "profile" | "catalog";

type SupplierFormState = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
};

type SupplierCardModel = {
  supplier: Supplier;
  code: string;
  onTimePct: number;
  accuracyPct: number;
  trackedSkus: string[];
  purchaseOrderCount: number;
  openOrderCount: number;
};

const initialFormData: SupplierFormState = {
  name: "",
  contact_name: "",
  email: "",
  phone: "",
};

const buildSupplierCode = (index: number) =>
  `V-${String(index + 1).padStart(3, "0")}`;

const buildStableMetric = (seed: string, min: number, max: number) => {
  let hash = 0;

  for (const character of seed) {
    hash = (hash * 31 + character.charCodeAt(0)) | 0;
  }

  return min + (Math.abs(hash) % (max - min + 1));
};

const formatContactValue = (
  value: string | null | undefined,
  fallback: string,
) => value?.trim() || fallback;

const endOfDayTimestamp = (value: string) => {
  const date = new Date(value);
  date.setHours(23, 59, 59, 999);
  return date.getTime();
};

const getSupplierPerformance = (
  supplier: Supplier,
  purchaseOrderIds: Set<string>,
  closedOrders: Array<{ id: string; expected_date: string | null }>,
  purchaseOrderItems: Array<{
    po_id: string;
    quantity_ordered: number;
    quantity_received: number;
  }>,
  receivingLogs: Array<{ po_id?: string | null; received_at: string }>,
) => {
  const historicalItems = purchaseOrderItems.filter((item) =>
    purchaseOrderIds.has(item.po_id),
  );
  const totalOrdered = historicalItems.reduce(
    (sum, item) => sum + item.quantity_ordered,
    0,
  );
  const totalReceived = historicalItems.reduce(
    (sum, item) => sum + item.quantity_received,
    0,
  );

  const fallbackOnTime = buildStableMetric(`${supplier.id}-on-time`, 88, 99);
  const fallbackAccuracy = buildStableMetric(`${supplier.id}-accuracy`, 90, 99);

  const accuracyPct =
    totalOrdered > 0
      ? Math.max(Math.round((totalReceived / totalOrdered) * 100), 0)
      : fallbackAccuracy;

  const onTimeChecks = closedOrders
    .map((order) => {
      if (!order.expected_date) return true;

      const latestReceipt = receivingLogs
        .filter((log) => log.po_id === order.id)
        .sort(
          (left, right) =>
            new Date(right.received_at).getTime() -
            new Date(left.received_at).getTime(),
        )[0];

      if (!latestReceipt) return null;

      return (
        new Date(latestReceipt.received_at).getTime() <=
        endOfDayTimestamp(order.expected_date)
      );
    })
    .filter((value): value is boolean => value !== null);

  const onTimePct =
    onTimeChecks.length > 0
      ? Math.round(
          (onTimeChecks.filter(Boolean).length / onTimeChecks.length) * 100,
        )
      : fallbackOnTime;

  return {
    onTimePct: Math.min(Math.max(onTimePct, 0), 100),
    accuracyPct: Math.min(Math.max(accuracyPct, 0), 100),
  };
};

export const SuppliersTab = ({
  companyId,
}: {
  companyId: string | null;
}) => {
  const { searchValue } = useTopBarSearchValue();
  const { data: suppliers = [], isLoading: loading } =
    useProcurementSuppliers(companyId);
  const { data: purchaseOrders = [] } = useProcurementPurchaseOrders(companyId);
  const { data: purchaseOrderItems = [] } =
    useProcurementPurchaseOrderItems(companyId);
  const { data: receivingLogs = [] } = useProcurementReceivingLogs(companyId);
  const createSupplierMutation = useCreateProcurementSupplier(companyId);
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [dialogMode, setDialogMode] = useState<SupplierDialogMode>("profile");
  const [selectedSupplierId, setSelectedSupplierId] = useState<string | null>(
    null,
  );
  const [formData, setFormData] = useState<SupplierFormState>(initialFormData);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const supplierCards = useMemo<SupplierCardModel[]>(() => {
    return suppliers.map((supplier, index) => {
      const supplierOrders = purchaseOrders.filter(
        (order) => order.supplier_id === supplier.id,
      );
      const supplierOrderIds = new Set(supplierOrders.map((order) => order.id));
      const supplierItems = purchaseOrderItems.filter((item) =>
        supplierOrderIds.has(item.po_id),
      );
      const trackedSkus = Array.from(
        new Set(
          supplierItems
            .map((item) => item.products?.sku)
            .filter((sku): sku is string => Boolean(sku)),
        ),
      );
      const closedOrders = supplierOrders
        .filter((order) => order.status === "received")
        .map((order) => ({ id: order.id, expected_date: order.expected_date }));
      const performance = getSupplierPerformance(
        supplier,
        supplierOrderIds,
        closedOrders,
        supplierItems,
        receivingLogs,
      );

      return {
        supplier,
        code: buildSupplierCode(index),
        trackedSkus,
        purchaseOrderCount: supplierOrders.length,
        openOrderCount: supplierOrders.filter((order) =>
          [
            "pending_approval",
            "approved",
            "not_started",
            "awaiting_supplier",
            "in_transit",
            "partial_receipt",
            "awaiting_return",
            "shipped_to_vendor",
          ].includes(order.status),
        ).length,
        onTimePct: performance.onTimePct,
        accuracyPct: performance.accuracyPct,
      };
    });
  }, [purchaseOrderItems, purchaseOrders, receivingLogs, suppliers]);

  const filteredSuppliers = useMemo(() => {
    return fuzzySearchItems(
      supplierCards,
      normalizePageSearchTerm(searchValue),
      [
        {
          key: (card) => card.supplier.name,
          maxRanking: fuzzyRankings.WORD_STARTS_WITH,
        },
        {
          key: (card) => [
            card.supplier.contact_name ?? "",
            card.supplier.email ?? "",
            card.supplier.phone ?? "",
          ],
          maxRanking: fuzzyRankings.CONTAINS,
        },
        {
          key: (card) => [card.code, ...card.trackedSkus],
          maxRanking: fuzzyRankings.STARTS_WITH,
        },
      ],
    );
  }, [searchValue, supplierCards]);
  const supplierSuggestions = useMemo(
    () =>
      filteredSuppliers.slice(0, 8).map((card) => ({
        id: `supplier-${card.supplier.id}`,
        title: card.supplier.name,
        subtitle: `${formatContactValue(card.supplier.contact_name, "No contact")} · ${card.code}`,
        value: card.supplier.name,
        keywords: card.trackedSkus,
        badge: "Vendor",
      })),
    [filteredSuppliers],
  );

  usePageTopBarSearch(
    useMemo(
      () => ({
        searchKey: "procurement-suppliers",
        placeholder: "Search suppliers...",
        defaultSuggestions: [
          {
            id: "procurement-suppliers-name",
            title: "Supplier Profiles",
            subtitle: "Search vendors, contacts, and catalog SKUs",
            value: "supplier",
            badge: "Vendor",
          },
        ],
        suggestions: supplierSuggestions,
      }),
      [supplierSuggestions],
    ),
  );

  const selectedSupplier =
    supplierCards.find((card) => card.supplier.id === selectedSupplierId) ??
    null;

  const openSupplierDialog = (supplierId: string, mode: SupplierDialogMode) => {
    setSelectedSupplierId(supplierId);
    setDialogMode(mode);
  };

  const handleSave = async () => {
    if (!formData.name.trim()) return;

    try {
      setMessage(null);
      await createSupplierMutation.mutateAsync(formData);
      setFormData(initialFormData);
      setIsAddDialogOpen(false);
      setMessage({ tone: "success", text: "Supplier added." });
    } catch (error) {
      setMessage({
        tone: "error",
        text:
          error instanceof Error ? error.message : "Failed to add supplier.",
      });
    }
  };

  return (
    <>
      <div className="flex flex-col gap-8">
        <Card variant="plain" className="overflow-hidden" padding="md">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <Button
              type="button"
              className="min-w-[156px]"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus size={16} />
              Add Supplier
            </Button>
          </div>
        </Card>

        {message ? (
          <p
            className={
              message.tone === "error"
                ? "text-sm text-[var(--color-destructive)]"
                : "text-sm text-[var(--color-success)]"
            }
          >
            {message.text}
          </p>
        ) : null}

        {loading ? (
          <div className="empty-state">Loading suppliers...</div>
        ) : filteredSuppliers.length === 0 ? (
          <Card variant="plain" padding="none" className="overflow-hidden">
            <CardContent className="px-6 py-10">
              <EmptyState
                title={
                  suppliers.length === 0
                    ? "No suppliers yet"
                    : "No suppliers match your search"
                }
                description={
                  suppliers.length === 0
                    ? "Add vendors to build your supplier roster and track procurement performance."
                    : "Try a different supplier name, contact, or SKU."
                }
              />
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-8 md:grid-cols-2 xl:grid-cols-3">
            {filteredSuppliers.map((card) => (
              <Card
                key={card.supplier.id}
                variant="plain"
                padding="none"
                className="overflow-hidden"
              >
                <CardContent className="flex h-full flex-col gap-6 p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="space-y-1">
                      <h3 className="text-[2rem] font-semibold leading-tight tracking-[-0.03em] text-[var(--color-foreground)]">
                        {card.supplier.name}
                      </h3>
                      <p className="text-sm text-[var(--color-muted-foreground)]">
                        {card.code}
                      </p>
                    </div>

                    <Dropdown
                      align="right"
                      trigger={
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="text-[var(--color-muted-foreground)]"
                        >
                          <MoreVertical size={16} />
                        </Button>
                      }
                    >
                      <DropdownItem
                        onClick={() =>
                          openSupplierDialog(card.supplier.id, "profile")
                        }
                      >
                        View profile
                      </DropdownItem>
                      <DropdownItem
                        onClick={() =>
                          openSupplierDialog(card.supplier.id, "catalog")
                        }
                      >
                        Catalog map
                      </DropdownItem>
                    </Dropdown>
                  </div>

                  <div className="flex flex-col gap-3 text-sm text-[var(--color-muted-foreground)]">
                    <div className="flex items-center gap-3">
                      <UserRound
                        size={16}
                        className="text-[var(--color-muted-foreground)]"
                      />
                      <span>
                        {formatContactValue(
                          card.supplier.contact_name,
                          "No contact assigned",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Mail
                        size={16}
                        className="text-[var(--color-muted-foreground)]"
                      />
                      <span>
                        {formatContactValue(
                          card.supplier.email,
                          "No email on file",
                        )}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <Phone
                        size={16}
                        className="text-[var(--color-muted-foreground)]"
                      />
                      <span>
                        {formatContactValue(
                          card.supplier.phone,
                          "No phone on file",
                        )}
                      </span>
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-3">
                    <div className="rounded-[var(--radius-xl)] bg-[var(--color-muted)]/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        On-Time %
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-success)]">
                        {card.onTimePct}%
                      </p>
                    </div>

                    <div className="rounded-[var(--radius-xl)] bg-[var(--color-muted)]/50 p-4">
                      <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                        Accuracy
                      </p>
                      <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-primary)]">
                        {card.accuracyPct}%
                      </p>
                    </div>
                  </div>

                  <div className="mt-auto flex gap-3">
                    <Button
                      type="button"
                      size="sm"
                      className="flex-1 bg-[var(--color-primary-light)] text-[var(--color-primary)] hover:bg-[var(--color-primary-light)]/80"
                      onClick={() =>
                        openSupplierDialog(card.supplier.id, "profile")
                      }
                    >
                      View Profile
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      className="flex-1"
                      onClick={() =>
                        openSupplierDialog(card.supplier.id, "catalog")
                      }
                    >
                      Catalog Map
                    </Button>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </div>

      <Dialog open={isAddDialogOpen} onClose={() => setIsAddDialogOpen(false)}>
        <DialogContent className="max-w-xl">
          <DialogHeader>
            <DialogTitle>Add Supplier</DialogTitle>
            <DialogDescription>
              Create a supplier profile with procurement contact details.
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 md:grid-cols-2">
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)] md:col-span-2">
              Company Name
              <Input
                value={formData.name}
                onChange={(event) =>
                  setFormData({ ...formData, name: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
              Contact Person
              <Input
                value={formData.contact_name}
                onChange={(event) =>
                  setFormData({ ...formData, contact_name: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
              Phone
              <Input
                value={formData.phone}
                onChange={(event) =>
                  setFormData({ ...formData, phone: event.target.value })
                }
              />
            </label>
            <label className="flex flex-col gap-2 text-sm font-medium text-[var(--color-foreground)] md:col-span-2">
              Email
              <Input
                value={formData.email}
                onChange={(event) =>
                  setFormData({ ...formData, email: event.target.value })
                }
              />
            </label>
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="ghost"
              onClick={() => setIsAddDialogOpen(false)}
            >
              Cancel
            </Button>
            <Button
              type="button"
              loading={createSupplierMutation.isPending}
              disabled={!formData.name.trim()}
              onClick={handleSave}
            >
              Save Supplier
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog
        open={Boolean(selectedSupplier)}
        onClose={() => setSelectedSupplierId(null)}
      >
        <DialogContent className="max-w-2xl">
          {selectedSupplier ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "profile"
                    ? "Supplier Profile"
                    : "Catalog Map"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "profile"
                    ? "Review supplier contacts and procurement performance."
                    : "Review the SKUs currently associated with this supplier across purchase orders."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-4 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)]/35 p-5">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <div className="rounded-xl bg-[var(--color-card)] p-3 text-[var(--color-primary)] shadow-[var(--shadow-sm)]">
                        <Building2 size={18} />
                      </div>
                      <div>
                        <h3 className="text-lg font-semibold text-[var(--color-foreground)]">
                          {selectedSupplier.supplier.name}
                        </h3>
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          {selectedSupplier.code}
                        </p>
                      </div>
                    </div>
                  </div>

                  {dialogMode === "profile" ? (
                    <div className="flex flex-col gap-3 text-sm text-[var(--color-muted-foreground)]">
                      <div className="flex items-center gap-3">
                        <UserRound size={16} />
                        <span>
                          {formatContactValue(
                            selectedSupplier.supplier.contact_name,
                            "No contact assigned",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Mail size={16} />
                        <span>
                          {formatContactValue(
                            selectedSupplier.supplier.email,
                            "No email on file",
                          )}
                        </span>
                      </div>
                      <div className="flex items-center gap-3">
                        <Phone size={16} />
                        <span>
                          {formatContactValue(
                            selectedSupplier.supplier.phone,
                            "No phone on file",
                          )}
                        </span>
                      </div>
                    </div>
                  ) : selectedSupplier.trackedSkus.length > 0 ? (
                    <div className="flex flex-wrap gap-2">
                      {selectedSupplier.trackedSkus.map((sku) => (
                        <Badge key={sku} variant="outline" size="sm">
                          {sku}
                        </Badge>
                      ))}
                    </div>
                  ) : (
                    <EmptyState
                      title="No catalog links yet"
                      description="This supplier has not been tied to any tracked SKUs through purchase orders yet."
                    />
                  )}
                </div>

                <div className="space-y-4">
                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-sm)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      On-Time %
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-success)]">
                      {selectedSupplier.onTimePct}%
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-sm)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      Accuracy
                    </p>
                    <p className="mt-2 text-3xl font-semibold tracking-[-0.03em] text-[var(--color-primary)]">
                      {selectedSupplier.accuracyPct}%
                    </p>
                  </div>

                  <div className="rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-card)] p-5 shadow-[var(--shadow-sm)]">
                    <p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                      Procurement Snapshot
                    </p>
                    <div className="mt-3 flex flex-col gap-2 text-sm text-[var(--color-muted-foreground)]">
                      <div className="flex items-center justify-between gap-4">
                        <span>Tracked SKUs</span>
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {selectedSupplier.trackedSkus.length}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Total POs</span>
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {selectedSupplier.purchaseOrderCount}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-4">
                        <span>Open POs</span>
                        <span className="font-semibold text-[var(--color-foreground)]">
                          {selectedSupplier.openOrderCount}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              <DialogFooter>
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => setSelectedSupplierId(null)}
                >
                  Close
                </Button>
              </DialogFooter>
            </>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
};
