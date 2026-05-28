import {
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  Badge,
  Body,
  Button,
  Container,
  DataTable,
  Heading,
  HStack,
  VStack,
  type DataTableColumn,
} from "@repo/ui";
import { BellRing, PackagePlus, Plus, Truck } from "lucide-react";

type StoqrOrderRow = {
  id: string;
  supplier: string;
  expected: string;
  status: string;
  total: string;
};

const orderRows: StoqrOrderRow[] = [
  {
    id: "PO-2026-1207",
    supplier: "TechGlobal Inc.",
    expected: "May 11, 2026",
    status: "Denied",
    total: "$0.00",
  },
  {
    id: "PO-2026-1206",
    supplier: "TechGlobal Inc.",
    expected: "May 17, 2026",
    status: "Awaiting Supplier",
    total: "$880.00",
  },
  {
    id: "PO-2026-1205",
    supplier: "Apex Materials",
    expected: "May 14, 2026",
    status: "In Transit",
    total: "$4,515.00",
  },
  {
    id: "PO-2026-1204",
    supplier: "Textile Wonders",
    expected: "May 9, 2026",
    status: "Partial Receipt",
    total: "$288.00",
  },
];

const orderColumns: DataTableColumn<StoqrOrderRow>[] = [
  {
    id: "id",
    header: "PO Number",
    width: "22%",
    renderCell: (row) => (
      <span className="font-semibold text-[var(--color-primary-hover)]">
        {row.id}
      </span>
    ),
  },
  {
    id: "supplier",
    header: "Supplier",
    width: "28%",
    renderCell: (row) => row.supplier,
  },
  {
    id: "expected",
    header: "Expected",
    width: "20%",
    renderCell: (row) => row.expected,
  },
  {
    id: "status",
    header: "Status",
    width: "18%",
    renderCell: (row) => <Badge variant="secondary">{row.status}</Badge>,
  },
  {
    id: "total",
    header: "Total",
    align: "right",
    width: "12%",
    renderCell: (row) => row.total,
  },
];

export function StoqrPage() {
  return (
    <Container size="xl" className="py-8">
      <VStack className="gap-7">
        <HStack align="start" justify="between" className="gap-4">
          <div>
            <Badge>StoQR page</Badge>
            <Heading level="h1" className="mt-3">
              Open StoQR Operations
            </Heading>
            <Body size="body3" muted className="mt-2 max-w-2xl">
              A focused preview for StoQR-style operational screens using the
              same shared components as the product app.
            </Body>
          </div>

          <HStack className="gap-2">
            <Button type="button" variant="ghost" size="sm">
              <BellRing className="h-4 w-4" />
              Auto-Generate
            </Button>
            <Button type="button" variant="ghost" size="sm">
              <Plus className="h-4 w-4" />
              Create PO
            </Button>
          </HStack>
        </HStack>

        <AnalyticsMetricGrid variant="stats-4">
          <AnalyticsMetricCard
            label="Total Items"
            value="3,267"
            accent={{ label: "+143%", direction: "up", tone: "positive" }}
          />
          <AnalyticsMetricCard
            label="Pending POs"
            value="8"
            accent={{ label: "6 scheduled", direction: "up", tone: "positive" }}
          />
          <AnalyticsMetricCard
            label="Low Stock"
            value="0"
            accent={{ label: "0 reorder", tone: "neutral" }}
          />
          <AnalyticsMetricCard
            label="Inventory Value"
            value="$132.14K"
            accent={{ label: "+1.3%", direction: "up", tone: "positive" }}
          />
        </AnalyticsMetricGrid>

        <section className="min-h-0">
          <HStack align="center" justify="between" className="mb-3">
            <Heading level="h3">Purchase Orders</Heading>
            <Badge variant="outline">Showing 4 of 57</Badge>
          </HStack>

          <DataTable
            columns={orderColumns}
            rows={orderRows}
            getRowId={(row) => row.id}
            minTableWidth={920}
            tableLayout="fixed"
            selection={{
              selectedRowIds: new Set(),
              onToggleRow: () => undefined,
              onToggleAll: () => undefined,
              selectAllLabel: "Select all purchase orders",
              getRowLabel: (row) => row.id,
                                }}
          />
        </section>

        <HStack wrap className="gap-3">
          <Badge variant="success">
            <Truck className="mr-1 h-3 w-3" />
            Receiving
          </Badge>
          <Badge variant="warning">
            <PackagePlus className="mr-1 h-3 w-3" />
            Reorder workflow
          </Badge>
          <Badge variant="info">Scanner ready</Badge>
        </HStack>
      </VStack>
    </Container>
  );
}
