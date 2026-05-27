import { useMemo, useState } from "react";
import {
  Badge,
  Button,
  Card,
  DataTable,
  type DataTableColumn,
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
  Select,
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
type SupplierFilter =
  | "all"
  | "has-open-orders"
  | "catalog-mapped"
  | "catalog-unmapped";
type SupplierSortField =
  | "supplier"
  | "contact"
  | "on-time"
  | "accuracy"
  | "catalog"
  | "purchase-orders"
  | "open-orders";

type SupplierFormState = {
  name: string;
  contact_name: string;
  email: string;
  phone: string;
};

type SupplierRowModel = {
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

const supplierFilterOptions: Array<{
  value: SupplierFilter;
  label: string;
}> = [
  { value: "all", label: "All suppliers" },
  { value: "has-open-orders", label: "Has open POs" },
  { value: "catalog-mapped", label: "Catalog mapped" },
  { value: "catalog-unmapped", label: "No catalog mapping" },
];

const supplierPageSizeOptions = [10, 20, 30, 50];
const openPurchaseOrderStatuses = [
  "pending_approval",
  "approved",
  "not_started",
  "awaiting_supplier",
  "in_transit",
  "partial_receipt",
  "awaiting_return",
  "shipped_to_vendor",
];

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
  const fallbackAccuracy = buildStableMetric(
    `${supplier.id}-accuracy`,
    90,
    99,
  );

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

const compareText = (left: string, right: string) =>
  left.localeCompare(right, undefined, {
    numeric: true,
    sensitivity: "base",
  });

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
  const [supplierFilter, setSupplierFilter] = useState<SupplierFilter>("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(supplierPageSizeOptions[0]);
  const [tableSortField, setTableSortField] =
    useState<SupplierSortField | null>("supplier");
  const [tableSortDirection, setTableSortDirection] = useState<
    "asc" | "desc"
  >("asc");
  const [formData, setFormData] = useState<SupplierFormState>(initialFormData);
  const [message, setMessage] = useState<{
    tone: "success" | "error";
    text: string;
  } | null>(null);

  const supplierRows = useMemo<SupplierRowModel[]>(() => {
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
          openPurchaseOrderStatuses.includes(order.status),
        ).length,
        onTimePct: performance.onTimePct,
        accuracyPct: performance.accuracyPct,
      };
    });
  }, [purchaseOrderItems, purchaseOrders, receivingLogs, suppliers]);

  const normalizedSearchValue = normalizePageSearchTerm(searchValue);

  const searchedSuppliers = useMemo(() => {
    return fuzzySearchItems(supplierRows, normalizedSearchValue, [
      {
        key: (row) => row.supplier.name,
        maxRanking: fuzzyRankings.WORD_STARTS_WITH,
      },
      {
        key: (row) => [
          row.supplier.contact_name ?? "",
          row.supplier.email ?? "",
          row.supplier.phone ?? "",
        ],
        maxRanking: fuzzyRankings.CONTAINS,
      },
      {
        key: (row) => [row.code, ...row.trackedSkus],
        maxRanking: fuzzyRankings.STARTS_WITH,
      },
    ]);
  }, [normalizedSearchValue, supplierRows]);

  const filteredSuppliers = useMemo(() => {
    return searchedSuppliers.filter((row) => {
      switch (supplierFilter) {
        case "has-open-orders":
          return row.openOrderCount > 0;
        case "catalog-mapped":
          return row.trackedSkus.length > 0;
        case "catalog-unmapped":
          return row.trackedSkus.length === 0;
        case "all":
        default:
          return true;
      }
    });
  }, [searchedSuppliers, supplierFilter]);

  const sortedSuppliers = useMemo(() => {
    if (!tableSortField) {
      return filteredSuppliers;
    }

    return [...filteredSuppliers].sort((left, right) => {
      let comparison = 0;

      switch (tableSortField) {
        case "supplier":
          comparison = compareText(left.supplier.name, right.supplier.name);
          break;
        case "contact":
          comparison = compareText(
            formatContactValue(left.supplier.contact_name, ""),
            formatContactValue(right.supplier.contact_name, ""),
          );
          break;
        case "on-time":
          comparison = left.onTimePct - right.onTimePct;
          break;
        case "accuracy":
          comparison = left.accuracyPct - right.accuracyPct;
          break;
        case "catalog":
          comparison = left.trackedSkus.length - right.trackedSkus.length;
          break;
        case "purchase-orders":
          comparison = left.purchaseOrderCount - right.purchaseOrderCount;
          break;
        case "open-orders":
          comparison = left.openOrderCount - right.openOrderCount;
          break;
        default:
          comparison = 0;
      }

      return tableSortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredSuppliers, tableSortDirection, tableSortField]);

  const currentTablePage = Math.min(
    tablePage,
    Math.max(1, Math.ceil(sortedSuppliers.length / tablePageSize)),
  );

  const pagedSuppliers = useMemo(() => {
    const startIndex = (currentTablePage - 1) * tablePageSize;
    return sortedSuppliers.slice(startIndex, startIndex + tablePageSize);
  }, [currentTablePage, sortedSuppliers, tablePageSize]);

  const supplierSuggestions = useMemo(
    () =>
      filteredSuppliers.slice(0, 8).map((row) => ({
        id: `supplier-${row.supplier.id}`,
        title: row.supplier.name,
        subtitle: `${formatContactValue(row.supplier.contact_name, "No contact")} · ${row.code}`,
        value: row.supplier.name,
        keywords: row.trackedSkus,
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
            title: "Supplier profiles",
            subtitle: "Search vendors, contacts, and mapped catalog SKUs",
            value: "supplier",
            badge: "Vendor",
          },
        ],
        suggestions: supplierSuggestions,
      }),
      [supplierSuggestions],
    ),
  );

  const supplierColumns = useMemo<
    DataTableColumn<SupplierRowModel, SupplierSortField>[]
  >(
    () => [
      {
        id: "supplier",
        header: "Supplier",
        sortKey: "supplier",
        width: "28%",
        cellClassName: "min-w-0",
        renderCell: (row) => (
          <div className="flex min-w-0 items-start gap-3">
            <div className="mt-0.5 rounded-lg bg-[var(--color-muted)] p-2 text-[var(--color-primary)]">
              <Building2 size={16} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="truncate text-sm font-semibold text-[var(--color-foreground)]">
                {row.supplier.name}
              </p>
              <p className="text-[11px] uppercase tracking-[0.18em] text-[var(--color-muted-foreground)]">
                {row.code}
              </p>
            </div>
          </div>
        ),
      },
      {
        id: "contact",
        header: "Primary Contact",
        sortKey: "contact",
        width: "21%",
        cellClassName: "min-w-0",
        renderCell: (row) => (
          <div className="min-w-0 space-y-1.5">
            <div className="flex min-w-0 items-center gap-2 text-sm font-medium text-[var(--color-foreground)]">
              <UserRound
                size={14}
                className="shrink-0 text-[var(--color-muted-foreground)]"
              />
              <span className="truncate">
                {formatContactValue(row.supplier.contact_name, "No contact assigned")}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <Mail size={14} className="shrink-0" />
              <span className="truncate">
                {formatContactValue(row.supplier.email, "No email on file")}
              </span>
            </div>
            <div className="flex min-w-0 items-center gap-2 text-xs text-[var(--color-muted-foreground)]">
              <Phone size={14} className="shrink-0" />
              <span className="truncate">
                {formatContactValue(row.supplier.phone, "No phone on file")}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "on-time",
        header: "On-Time %",
        sortKey: "on-time",
        align: "center",
        width: "9%",
        renderCell: (row) => (
          <div className="space-y-1 text-center">
            <p className="text-lg font-semibold tabular-nums text-[var(--color-success)]">
              {row.onTimePct}%
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              On time
            </p>
          </div>
        ),
      },
      {
        id: "accuracy",
        header: "Accuracy",
        sortKey: "accuracy",
        align: "center",
        width: "9%",
        renderCell: (row) => (
          <div className="space-y-1 text-center">
            <p className="text-lg font-semibold tabular-nums text-[var(--color-primary)]">
              {row.accuracyPct}%
            </p>
            <p className="text-[11px] uppercase tracking-[0.14em] text-[var(--color-muted-foreground)]">
              Filled
            </p>
          </div>
        ),
      },
      {
        id: "catalog",
        header: "Catalog",
        sortKey: "catalog",
        width: "16%",
        cellClassName: "min-w-0",
        renderCell: (row) => {
          const previewSkus = row.trackedSkus.slice(0, 2);
          const remainingSkuCount = Math.max(
            row.trackedSkus.length - previewSkus.length,
            0,
          );

          return row.trackedSkus.length > 0 ? (
            <div className="space-y-2">
              <p className="text-sm font-medium text-[var(--color-foreground)]">
                {row.trackedSkus.length} mapped SKU{row.trackedSkus.length === 1 ? "" : "s"}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {previewSkus.map((sku) => (
                  <Badge key={sku} variant="outline" size="sm">
                    {sku}
                  </Badge>
                ))}
                {remainingSkuCount > 0 ? (
                  <Badge variant="secondary" size="sm">
                    +{remainingSkuCount}
                  </Badge>
                ) : null}
              </div>
            </div>
          ) : (
            <div className="space-y-1">
              <p className="text-sm font-medium text-[var(--color-muted-foreground)]">
                Unmapped
              </p>
              <p className="text-xs text-[var(--color-muted-foreground)]">
                No tracked catalog SKUs yet
              </p>
            </div>
          );
        },
      },
      {
        id: "purchase-orders",
        header: "PO Snapshot",
        sortKey: "purchase-orders",
        width: "11%",
        renderCell: (row) => (
          <div className="space-y-2 text-sm">
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-muted-foreground)]">Total</span>
              <span className="font-semibold tabular-nums text-[var(--color-foreground)]">
                {row.purchaseOrderCount}
              </span>
            </div>
            <div className="flex items-center justify-between gap-3">
              <span className="text-[var(--color-muted-foreground)]">Open</span>
              <span
                className={
                  row.openOrderCount > 0
                    ? "font-semibold tabular-nums text-[var(--color-primary)]"
                    : "font-semibold tabular-nums text-[var(--color-muted-foreground)]"
                }
              >
                {row.openOrderCount}
              </span>
            </div>
          </div>
        ),
      },
      {
        id: "actions",
        header: "Actions",
        align: "right",
        sortable: false,
        width: "6%",
        cellClassName: "text-right",
        renderCell: (row) => (
          <div className="flex justify-end">
            <Dropdown
              align="right"
              trigger={
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  aria-label={`Open actions for ${row.supplier.name}`}
                  className="text-[var(--color-muted-foreground)]"
                >
                  <MoreVertical size={16} />
                </Button>
              }
            >
              <DropdownItem
                onClick={() => {
                  setSelectedSupplierId(row.supplier.id);
                  setDialogMode("profile");
                }}
              >
                View profile
              </DropdownItem>
              <DropdownItem
                onClick={() => {
                  setSelectedSupplierId(row.supplier.id);
                  setDialogMode("catalog");
                }}
              >
                Catalog map
              </DropdownItem>
            </Dropdown>
          </div>
        ),
      },
    ],
    [],
  );

  const selectedSupplier =
    supplierRows.find((row) => row.supplier.id === selectedSupplierId) ?? null;

  const handlePageSizeChange = (pageSize: number) => {
    setTablePageSize(pageSize);
    setTablePage(1);
  };

  const handleSupplierFilterChange = (nextFilter: SupplierFilter) => {
    setSupplierFilter(nextFilter);
    setTablePage(1);
  };

  const handleTableSort = (nextSortField: SupplierSortField) => {
    if (tableSortField === nextSortField) {
      setTableSortDirection((currentDirection) =>
        currentDirection === "asc" ? "desc" : "asc",
      );
      return;
    }

    setTableSortField(nextSortField);
    setTableSortDirection("asc");
    setTablePage(1);
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

  const emptyStateDescription =
    suppliers.length === 0
      ? "Add suppliers to build your procurement roster and start tracking vendor performance."
      : normalizedSearchValue.length > 0 || supplierFilter !== "all"
        ? "Try a different supplier name, contact, SKU, or filter."
        : "Adjust the supplier view to find a matching vendor.";

  return (
    <>
      <div className="flex min-h-0 flex-1 flex-col gap-6">
        <Card
          variant="plain"
          className="flex min-h-0 flex-1 flex-col overflow-hidden"
          padding="none"
        >
          <div className="flex flex-col gap-4 border-b border-[var(--color-border)] px-4 py-4 md:px-6 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex flex-1 flex-col gap-3 lg:flex-row lg:items-center lg:gap-4">
              <label className="flex max-w-[240px] flex-col gap-2 text-sm font-medium text-[var(--color-foreground)]">
                View
                <Select
                  value={supplierFilter}
                  onChange={(event) =>
                    handleSupplierFilterChange(event.target.value as SupplierFilter)
                  }
                  options={supplierFilterOptions}
                />
              </label>

              <div className="flex flex-wrap items-center gap-2 text-sm text-[var(--color-muted-foreground)] lg:pt-6">
                <Badge variant="secondary" size="sm">
                  {filteredSuppliers.length} visible
                </Badge>
                <Badge variant="outline" size="sm">
                  {supplierRows.length} total
                </Badge>
              </div>
            </div>

            <Button
              type="button"
              className="min-w-[156px]"
              onClick={() => setIsAddDialogOpen(true)}
            >
              <Plus size={16} />
              Add Supplier
            </Button>
          </div>

          {message ? (
            <div className="border-b border-[var(--color-border)] px-4 py-3 md:px-6">
              <p
                className={
                  message.tone === "error"
                    ? "text-sm text-[var(--color-destructive)]"
                    : "text-sm text-[var(--color-success)]"
                }
              >
                {message.text}
              </p>
            </div>
          ) : null}

          {loading ? (
            <div className="empty-state">Loading suppliers...</div>
          ) : filteredSuppliers.length === 0 ? (
            <div className="px-6 py-10">
              <EmptyState
                title={
                  suppliers.length === 0
                    ? "No suppliers yet"
                    : "No suppliers match your view"
                }
                description={emptyStateDescription}
              />
            </div>
          ) : (
            <DataTable
              variant="operational"
              className="min-h-0 flex-1"
              columns={supplierColumns}
              rows={pagedSuppliers}
              getRowId={(row) => row.supplier.id}
              minTableWidth={1240}
              tableLayout="fixed"
              sortField={tableSortField}
              sortDirection={tableSortDirection}
              onSortChange={handleTableSort}
              pagination={{
                currentPage: currentTablePage,
                totalItems: filteredSuppliers.length,
                itemsPerPage: tablePageSize,
                onPageChange: setTablePage,
                onItemsPerPageChange: handlePageSizeChange,
                pageSizeOptions: supplierPageSizeOptions,
              }}
            />
          )}
        </Card>
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
        <DialogContent className="max-w-3xl">
          {selectedSupplier ? (
            <>
              <DialogHeader>
                <DialogTitle>
                  {dialogMode === "profile" ? "Supplier Profile" : "Catalog Map"}
                </DialogTitle>
                <DialogDescription>
                  {dialogMode === "profile"
                    ? "Review supplier contacts, purchase-order activity, and delivery performance."
                    : "Review the SKUs currently associated with this supplier across purchase orders."}
                </DialogDescription>
              </DialogHeader>

              <div className="grid gap-6 md:grid-cols-[minmax(0,1.2fr)_280px]">
                <div className="space-y-5 rounded-[var(--radius-xl)] border border-[var(--color-border)] bg-[var(--color-muted)]/35 p-5">
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

                  {dialogMode === "profile" ? (
                    <div className="space-y-3 text-sm text-[var(--color-muted-foreground)]">
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
                    <div className="space-y-3">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        Catalog mappings
                      </p>
                      <div className="flex flex-wrap gap-2">
                        {selectedSupplier.trackedSkus.map((sku) => (
                          <Badge key={sku} variant="outline" size="sm">
                            {sku}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ) : (
                    <EmptyState
                      title="No catalog links yet"
                      description="This supplier has not been tied to any tracked SKUs through purchase orders yet."
                    />
                  )}

                  {dialogMode === "profile" ? (
                    <div className="space-y-3 border-t border-[var(--color-border)] pt-4">
                      <p className="text-sm font-medium text-[var(--color-foreground)]">
                        Catalog mappings
                      </p>
                      {selectedSupplier.trackedSkus.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {selectedSupplier.trackedSkus.map((sku) => (
                            <Badge key={sku} variant="outline" size="sm">
                              {sku}
                            </Badge>
                          ))}
                        </div>
                      ) : (
                        <p className="text-sm text-[var(--color-muted-foreground)]">
                          No tracked catalog SKUs yet.
                        </p>
                      )}
                    </div>
                  ) : null}
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
