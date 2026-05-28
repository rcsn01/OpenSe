import { type ReactNode, useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AccordionItem,
  Alert,
  AnalyticsAreaChart,
  AnalyticsBarChart,
  AnalyticsComparisonBars,
  AnalyticsDonutChart,
  AnalyticsEmptyPanel,
  AnalyticsLegend,
  AnalyticsLineChart,
  AnalyticsMetricCard,
  AnalyticsMetricGrid,
  AnalyticsMiniSparkline,
  AnalyticsPanel,
  AnalyticsTablePanel,
  Avatar,
  AvatarGroup,
  Badge,
  BasePage,
  Body,
  Breadcrumb,
  Button,
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
  Checkbox,
  Code,
  ColorPalette,
  Container,
  DataTable,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  Divider,
  DotPulse,
  Dropdown,
  DropdownItem,
  DropdownMenu,
  DropdownSeparator,
  EmptyState,
  ErrorBoundary,
  Grid,
  Heading,
  HStack,
  Input,
  InventoryViewToggle,
  InventoryToolbarControls,
  Label,
  OrganisationMembersTable,
  OrganisationPermissionsPanel,
  OrganisationTeamsPage,
  OrganisationTeamsShell,
  OrganisationTeamsTab,
  Pagination,
  ProfileDropdown,
  Progress,
  Radio,
  Select,
  Shades,
  SideNav,
  SideNavBrandSlot,
  SideNavGroup,
  SideNavGroupList,
  SideNavItem,
  SideNavUserProfile,
  Sidebar,
  SidebarItem,
  SidebarSection,
  SideSheet,
  SideSheetBody,
  SideSheetContent,
  SideSheetDescription,
  SideSheetFooter,
  SideSheetHeader,
  SideSheetTitle,
  Skeleton,
  Spinner,
  FilterDropdown,
  StackLayout,
  StatusBadge,
  SwitchAppTopBar,
  TabBar,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Textarea,
  Toggle,
  Tooltip,
  TopBar,
  VStack,
  useTheme,
  useToast,
  AddFilterDropdown,
} from "@repo/ui";
import type {
  DataTableColumn,
  DataTableTopRowConfig,
  OrganisationMembersTableRow,
  OrganisationPermission,
  OrganisationRole,
  OrganisationTeamsTabMember,
} from "@repo/ui";
import {
  BarChart3,
  Bell,
  Boxes,
  Download,
  FileText,
  Palette,
  Plus,
  RotateCcw,
  Search,
  Settings,
  Trash2,
  UserPlus,
  Workflow,
} from "lucide-react";

type InventoryRow = {
  id: string;
  sku: string;
  item: string;
  folder: string;
  price: number;
  available: number;
};

type InventorySortKey = "sku" | "item" | "folder" | "price" | "available";
type InventoryFilterTemplate =
  | "all"
  | "PCR"
  | "Safety"
  | "Dispatch"
  | "Warehouse";

type AnalyticsAlertRow = {
  name: string;
  severity: string;
  owner: string;
};

const inventoryRows: InventoryRow[] = [
  {
    id: "inv-1",
    sku: "PCR-001",
    item: "0.5mL Eppendorf Tubes",
    folder: "PCR Consumables",
    price: 19.84,
    available: 62,
  },
  {
    id: "inv-2",
    sku: "PCR-002",
    item: "1.5mL Eppendorf Tubes",
    folder: "PCR Consumables",
    price: 22.3,
    available: 72,
  },
  {
    id: "inv-3",
    sku: "SAF-010",
    item: "10 x 2mL Nuclease Free Water",
    folder: "Safety & Sanitation",
    price: 115.66,
    available: 24,
  },
  {
    id: "inv-4",
    sku: "DIS-022",
    item: "2.0mL Eppendorf Tubes",
    folder: "Dispatch & Returns",
    price: 24.75,
    available: 102,
  },
  {
    id: "inv-5",
    sku: "SAF-014",
    item: "3% Bleach, 5L",
    folder: "Safety & Sanitation",
    price: 105.83,
    available: 87,
  },
  {
    id: "inv-6",
    sku: "PCR-009",
    item: "5.0mL Eppendorf Tubes",
    folder: "PCR Consumables",
    price: 27.21,
    available: 112,
  },
  {
    id: "inv-7",
    sku: "SAF-018",
    item: "Adapt Cable Ties Pack 100",
    folder: "Safety & Sanitation",
    price: 125.49,
    available: 84,
  },
  {
    id: "inv-8",
    sku: "PCR-013",
    item: "Adhesive PCR Sealing Foil",
    folder: "PCR Consumables",
    price: 91.09,
    available: 80,
  },
  {
    id: "inv-9",
    sku: "SAF-020",
    item: "Clinical Waste Bags 72L",
    folder: "Safety & Sanitation",
    price: 123.03,
    available: 74,
  },
  {
    id: "inv-10",
    sku: "SAF-024",
    item: "Baxter Water for Irrigation",
    folder: "Safety & Sanitation",
    price: 78.81,
    available: 108,
  },
  {
    id: "inv-11",
    sku: "LAB-030",
    item: "Sample Tray Insert",
    folder: "Warehouse Network",
    price: 14.4,
    available: 58,
  },
  {
    id: "inv-12",
    sku: "LAB-034",
    item: "Thermal Labels",
    folder: "Warehouse Network",
    price: 9.2,
    available: 145,
  },
];

const stockStatusOptions = [
  { value: "all", label: "All Statuses" },
  { value: "low", label: "Low Stock" },
  { value: "out", label: "Out of Stock" },
];

const filterItems = [
  { value: "location", label: "Location" },
  { value: "batch", label: "Batch" },
  { value: "supplier", label: "Supplier" },
];

const inventoryFilterTemplates: Array<{
  value: InventoryFilterTemplate;
  label: string;
  folderMatch?: string;
}> = [
  { value: "all", label: "All" },
  { value: "PCR", label: "PCR", folderMatch: "PCR" },
  { value: "Safety", label: "Safety", folderMatch: "Safety" },
  { value: "Dispatch", label: "Dispatch", folderMatch: "Dispatch" },
  { value: "Warehouse", label: "Warehouse", folderMatch: "Warehouse" },
];

const draftInventoryRow: InventoryRow = {
  id: "inv-draft",
  sku: "DRAFT-001",
  item: "Draft receiving template",
  folder: "Warehouse Network",
  price: 0,
  available: 0,
};

const analyticsTrendData = [
  { month: "Jan", inbound: 42, outbound: 28 },
  { month: "Feb", inbound: 49, outbound: 33 },
  { month: "Mar", inbound: 45, outbound: 38 },
  { month: "Apr", inbound: 54, outbound: 41 },
  { month: "May", inbound: 61, outbound: 44 },
  { month: "Jun", inbound: 58, outbound: 48 },
];

const analyticsAreaData = [
  { week: "W1", value: 14 },
  { week: "W2", value: 22 },
  { week: "W3", value: 18 },
  { week: "W4", value: 29 },
  { week: "W5", value: 26 },
];

const analyticsBarData = [
  { label: "PCR", units: 128 },
  { label: "Safety", units: 88 },
  { label: "Warehouse", units: 61 },
  { label: "Dispatch", units: 37 },
];

const analyticsDonutData = [
  { name: "In Stock", value: 72 },
  { name: "Low Stock", value: 18 },
  { name: "Out of Stock", value: 10 },
];

const analyticsComparisonData = [
  { label: "Mon", inbound: 14, outbound: 9 },
  { label: "Tue", inbound: 18, outbound: 13 },
  { label: "Wed", inbound: 11, outbound: 8 },
  { label: "Thu", inbound: 22, outbound: 15 },
  { label: "Fri", inbound: 19, outbound: 17 },
];

const permissionCatalog: OrganisationPermission[] = [
  { code: "inventory.view", description: "View inventory" },
  { code: "inventory.edit", description: "Edit inventory" },
  { code: "inventory.manage", description: "Manage inventory" },
  { code: "reports.view", description: "View reports" },
  { code: "reports.manage", description: "Manage reports" },
  { code: "alerts.view", description: "View alerts" },
  { code: "alerts.manage", description: "Manage alerts" },
];

const initialRoles: OrganisationRole[] = [
  {
    id: "role-owner",
    name: "Owner",
    description: "Full account access",
    roleRank: 0,
    permissionCodes: permissionCatalog.map((permission) => permission.code),
  },
  {
    id: "role-ops",
    name: "Operations",
    description: "Manage stock and reporting",
    roleRank: 10,
    permissionCodes: [
      "inventory.view",
      "inventory.edit",
      "reports.view",
      "alerts.view",
    ],
  },
  {
    id: "role-auditor",
    name: "Auditor",
    description: "Read-only oversight",
    roleRank: 20,
    permissionCodes: ["inventory.view", "reports.view", "alerts.view"],
  },
];

const initialMembers: OrganisationTeamsTabMember[] = [
  {
    id: "member-1",
    displayName: "Jordan Lee",
    subtitle: "Operations Lead",
    roleId: "role-ops",
    initials: "JL",
  },
  {
    id: "member-2",
    displayName: "Riley Patel",
    subtitle: "Warehouse Manager",
    roleId: "role-ops",
    initials: "RP",
  },
  {
    id: "member-3",
    displayName: "Sam Harper",
    subtitle: "Compliance Auditor",
    roleId: "role-auditor",
    initials: "SH",
  },
];

const currencyFormatter = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 2,
});

function GallerySection({
  id,
  title,
  description,
  children,
}: {
  id: string;
  title: string;
  description: string;
  children: ReactNode;
}) {
  return (
    <section id={id} className="ui-gallery-section">
      <div className="ui-gallery-section-heading">
        <Heading level="h2">{title}</Heading>
        <Body size="body4" muted>
          {description}
        </Body>
      </div>
      {children}
    </section>
  );
}

function GallerySubsection({
  title,
  children,
}: {
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="ui-gallery-subsection">
      <Label>{title}</Label>
      {children}
    </div>
  );
}

function GalleryCanvas({
  children,
  roomy = false,
}: {
  children: ReactNode;
  roomy?: boolean;
}) {
  return (
    <div
      className={
        roomy
          ? "ui-gallery-canvas ui-gallery-canvas--roomy"
          : "ui-gallery-canvas"
      }
    >
      {children}
    </div>
  );
}

function ErrorBoundaryCrashDemo() {
  const [shouldThrow, setShouldThrow] = useState(false);

  if (shouldThrow) {
    throw new Error("Shared component crash demo");
  }

  return (
    <Button
      type="button"
      variant="outline"
      onClick={() => setShouldThrow(true)}
    >
      Trigger error boundary
    </Button>
  );
}

export function SharedComponentsPage() {
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { theme, resolvedTheme, setTheme } = useTheme();
  const [dialogOpen, setDialogOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [tab, setTab] = useState("overview");
  const [view, setView] = useState<"list" | "grid">("list");
  const [stockStatus, setStockStatus] = useState("all");
  const [tablePage, setTablePage] = useState(1);
  const [tablePageSize, setTablePageSize] = useState(5);
  const [sortField, setSortField] = useState<InventorySortKey | null>("item");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");
  const [inventoryFilter, setInventoryFilter] =
    useState<InventoryFilterTemplate>("all");
  const [hasDraftRow, setHasDraftRow] = useState(false);
  const [teamFilter, setTeamFilter] = useState("all");
  const [roles, setRoles] = useState<OrganisationRole[]>(initialRoles);
  const [members, setMembers] =
    useState<OrganisationTeamsTabMember[]>(initialMembers);
  const [roleChangeMessage, setRoleChangeMessage] = useState<string | null>(
    "Changes update immediately in this preview.",
  );

  useEffect(() => {
    if (!location.hash) return;

    const sectionId = location.hash.slice(1);
    const rafId = window.requestAnimationFrame(() => {
      const section = document.getElementById(sectionId);
      const scrollContainer = section?.closest<HTMLElement>(
        "[data-app-scroll-container]",
      );

      if (!section || !scrollContainer) return;

      window.scrollTo({ top: 0, left: 0 });

      const sectionTop =
        section.getBoundingClientRect().top -
        scrollContainer.getBoundingClientRect().top +
        scrollContainer.scrollTop;

      scrollContainer.scrollTo({ top: sectionTop });
    });

    return () => window.cancelAnimationFrame(rafId);
  }, [location.hash]);

  const filteredRows = useMemo(() => {
    const baseRows = hasDraftRow
      ? [draftInventoryRow, ...inventoryRows]
      : inventoryRows;
    const activeTemplate = inventoryFilterTemplates.find(
      (template) => template.value === inventoryFilter,
    );

    if (!activeTemplate?.folderMatch) return baseRows;

    return baseRows.filter((row) =>
      row.folder.includes(activeTemplate.folderMatch),
    );
  }, [hasDraftRow, inventoryFilter]);

  const sortedRows = useMemo(() => {
    if (!sortField) return filteredRows;

    return [...filteredRows].sort((left, right) => {
      const leftValue = left[sortField];
      const rightValue = right[sortField];

      if (typeof leftValue === "number" && typeof rightValue === "number") {
        return sortDirection === "asc"
          ? leftValue - rightValue
          : rightValue - leftValue;
      }

      const comparison = String(leftValue).localeCompare(String(rightValue));
      return sortDirection === "asc" ? comparison : -comparison;
    });
  }, [filteredRows, sortDirection, sortField]);

  const pagedRows = useMemo(() => {
    const startIndex = (tablePage - 1) * tablePageSize;
    return sortedRows.slice(startIndex, startIndex + tablePageSize);
  }, [sortedRows, tablePage, tablePageSize]);

  const teamRoles = useMemo(
    () => roles.map((role) => ({ id: role.id, name: role.name })),
    [roles],
  );

  const memberRows = useMemo<OrganisationMembersTableRow[]>(
    () =>
      members.map((member) => ({
        id: member.id,
        displayName: member.displayName,
        subtitle: member.subtitle,
        initials: member.initials,
        roleContent: (
          <Badge variant="outline">
            {teamRoles.find((role) => role.id === member.roleId)?.name ??
              "Member"}
          </Badge>
        ),
        statusContent: <StatusBadge label="Active" tone="success" />,
      })),
    [members, teamRoles],
  );

  const inventoryTableDividerClassName = "border-b border-[#d6d6d6]";
  const inventoryColumns: Array<
    DataTableColumn<InventoryRow, InventorySortKey>
  > = [
    {
      id: "item",
      header: "Item",
      sortKey: "item",
      headerClassName: inventoryTableDividerClassName,
      renderCell: (row) => (
        <div className="ui-table-cell-stack">
          <span>{row.item}</span>
          <span className="ui-table-cell-meta">{row.sku}</span>
        </div>
      ),
    },
    {
      id: "folder",
      header: "Folder",
      sortKey: "folder",
      headerClassName: inventoryTableDividerClassName,
      renderCell: (row) => row.folder,
    },
    {
      id: "price",
      header: "Price",
      sortKey: "price",
      align: "right",
      headerClassName: inventoryTableDividerClassName,
      renderCell: (row) => currencyFormatter.format(row.price),
    },
    {
      id: "available",
      header: "Available",
      sortKey: "available",
      align: "right",
      headerClassName: inventoryTableDividerClassName,
      renderCell: (row) => row.available,
    },
  ];

  const handleSort = (nextField: InventorySortKey) => {
    if (sortField === nextField) {
      setSortDirection((current) => (current === "asc" ? "desc" : "asc"));
      return;
    }

    setSortField(nextField);
    setSortDirection("asc");
  };

  const applyFilterTemplate = (nextFilter: InventoryFilterTemplate) => {
    setInventoryFilter(nextFilter);
    setTablePage(1);
  };

  const handleAddDraftRow = () => {
    setHasDraftRow(true);
    setTablePage(1);
    toast({
      title: "Draft row added",
      message: "A local demo row was added to the table.",
      variant: "success",
    });
  };

  const handleRemoveDraftRow = () => {
    setHasDraftRow(false);
    setTablePage(1);
    toast({
      title: "Draft row removed",
      message: "The local demo row was removed from the table.",
      variant: "info",
    });
  };

  const handleResetTableTemplates = () => {
    setInventoryFilter("all");
    setHasDraftRow(false);
    setSortField("item");
    setSortDirection("asc");
    setTablePage(1);
    toast({
      title: "Table templates reset",
      message: "Filters, sorting, and draft actions are back to defaults.",
      variant: "default",
    });
  };

  const tableTemplateRow: DataTableTopRowConfig = {
    filters: [
      {
        id: "inventory-filter",
        value: inventoryFilter,
        options: inventoryFilterTemplates,
        onChange: (value) =>
          applyFilterTemplate(value as InventoryFilterTemplate),
        ariaLabel: "Inventory table filter",
        menuClassName: "min-w-[160px]",
      },
    ],
    actions: [
      {
        id: "add-draft",
        label: "Add draft",
        icon: <Plus className="h-4 w-4" />,
        variant: "ghost",
        size: "sm",
        disabled: hasDraftRow,
        onClick: handleAddDraftRow,
      },
      {
        id: "remove-draft",
        label: "Remove draft",
        icon: <Trash2 className="h-4 w-4" />,
        variant: "ghost",
        size: "sm",
        disabled: !hasDraftRow,
        onClick: handleRemoveDraftRow,
      },
      {
        id: "reset",
        label: "Reset",
        icon: <RotateCcw className="h-4 w-4" />,
        variant: "ghost",
        size: "sm",
        onClick: handleResetTableTemplates,
      },
    ],
  };

  return (
    <Container size="xl" className="ui-gallery-shell">
      <VStack className="ui-gallery-stack">
        <GallerySection
          id="overview"
          title="Shared Component Gallery"
          description="This app now shows the shared system directly. The current shell is also shared: ThemeProvider, ToastProvider, AppLayout, SideNav, SwitchAppTopBar, ProfileDropdown, and SwitchAppPopover are already powering the chrome around this page."
        >
          <div className="ui-gallery-overview">
            <div className="ui-gallery-chip-row">
              <Badge>AppLayout shell</Badge>
              <Badge variant="outline">Theme: {theme}</Badge>
              <Badge variant="outline">Resolved: {resolvedTheme}</Badge>
              <StatusBadge label="Shared defaults" tone="success" />
            </div>

            <div className="ui-gallery-grid">
              <GalleryCanvas>
                <VStack className="ui-gallery-tight-stack">
                  <Heading level="h4">Theme controls</Heading>
                  <HStack wrap>
                    <Button
                      type="button"
                      variant={theme === "light" ? "primary" : "outline"}
                      onClick={() => setTheme("light")}
                    >
                      Light
                    </Button>
                    <Button
                      type="button"
                      variant={theme === "dark" ? "primary" : "outline"}
                      onClick={() => setTheme("dark")}
                    >
                      Dark
                    </Button>
                    <Button
                      type="button"
                      variant={theme === "system" ? "primary" : "outline"}
                      onClick={() => setTheme("system")}
                    >
                      System
                    </Button>
                  </HStack>
                  <Body size="body5" muted>
                    The current app chrome is the live ThemeProvider showcase.
                  </Body>
                </VStack>
              </GalleryCanvas>

              <GalleryCanvas>
                <VStack className="ui-gallery-tight-stack">
                  <Heading level="h4">Shell previews</Heading>
                  <Body size="body5" muted>
                    The app already runs inside the default shared sidebar. The
                    only separate preview left is for the landing navbar.
                  </Body>
                  <HStack wrap>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() => navigate("/preview/landing-navbar")}
                    >
                      Open Landing Navbar
                    </Button>
                  </HStack>
                </VStack>
              </GalleryCanvas>

              <GalleryCanvas>
                <VStack className="ui-gallery-tight-stack">
                  <Heading level="h4">Global actions</Heading>
                  <HStack wrap>
                    <Button
                      type="button"
                      onClick={() =>
                        toast({
                          title: "Saved",
                          message: "ToastProvider is live in this app.",
                          variant: "success",
                        })
                      }
                    >
                      Success toast
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      onClick={() =>
                        toast({
                          title: "Heads up",
                          message: "Warnings stay border-light too.",
                          variant: "warning",
                        })
                      }
                    >
                      Warning toast
                    </Button>
                  </HStack>
                </VStack>
              </GalleryCanvas>
            </div>
          </div>
        </GallerySection>

        <GallerySection
          id="foundations"
          title="Foundations"
          description="Shared typography, tokens, and layout primitives without page-specific styling."
        >
          <div className="ui-gallery-grid ui-gallery-grid--wide">
            <GalleryCanvas roomy>
              <VStack>
                <Heading level="h1">Heading H1</Heading>
                <Heading level="h2">Heading H2</Heading>
                <Heading level="h3">Heading H3</Heading>
                <Body size="body1">
                  Shared body copy should feel neutral, readable, and calm
                  across the apps.
                </Body>
                <Body size="body4" muted>
                  Muted body text
                </Body>
                <Label>Section label</Label>
                <Code>pnpm --filter @repo/ui test</Code>
              </VStack>
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <VStack>
                <Heading level="h4">Layout primitives</Heading>
                <Divider />
                <VStack>
                  <Label>Container + Grid</Label>
                  <Grid cols={3} className="ui-gallery-demo-grid">
                    <Badge variant="outline">Grid</Badge>
                    <Badge variant="outline">Uses shared spacing</Badge>
                    <Badge variant="outline">No custom skin</Badge>
                  </Grid>
                </VStack>
                <HStack wrap>
                  <Badge>Badge</Badge>
                  <Badge variant="secondary">Secondary</Badge>
                  <Badge variant="success">Success</Badge>
                  <Badge variant="warning">Warning</Badge>
                  <Badge variant="destructive">Destructive</Badge>
                  <Badge variant="info">Info</Badge>
                  <Badge variant="outline">Outline</Badge>
                </HStack>
              </VStack>
            </GalleryCanvas>
          </div>

          <GallerySubsection title="Color tokens">
            <div className="ui-gallery-grid ui-gallery-grid--wide">
              <GalleryCanvas roomy>
                <ColorPalette />
              </GalleryCanvas>
              <GalleryCanvas roomy>
                <Shades />
              </GalleryCanvas>
            </div>
          </GallerySubsection>
        </GallerySection>

        <GallerySection
          id="actions"
          title="Actions"
          description="Shared buttons, cards, and small status affordances with the flatter surface language."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas>
              <VStack className="ui-gallery-tight-stack">
                <Label>Buttons</Label>
                <HStack wrap>
                  <Button type="button">Primary</Button>
                  <Button type="button" variant="secondary">
                    Secondary
                  </Button>
                  <Button type="button" variant="outline">
                    Outline
                  </Button>
                  <Button type="button" variant="ghost">
                    Ghost
                  </Button>
                  <Button type="button" variant="destructive">
                    Destructive
                  </Button>
                  <Button type="button" variant="link">
                    Link button
                  </Button>
                  <Button type="button" size="icon" aria-label="Add item">
                    <Plus className="h-4 w-4" />
                  </Button>
                </HStack>
              </VStack>
            </GalleryCanvas>

            <GalleryCanvas>
              <Card>
                <CardHeader>
                  <CardTitle>Shared Card</CardTitle>
                  <CardDescription>
                    The default card now uses a softer, border-light surface.
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Body size="body4">
                    Cards still exist, but they no longer do most of the
                    separation work.
                  </Body>
                </CardContent>
                <CardFooter>
                  <Button type="button" variant="outline">
                    Secondary action
                  </Button>
                  <Button type="button">Primary action</Button>
                </CardFooter>
              </Card>
            </GalleryCanvas>

            <GalleryCanvas>
              <VStack className="ui-gallery-tight-stack">
                <Label>Status</Label>
                <HStack wrap>
                  <StatusBadge label="Healthy" tone="success" />
                  <StatusBadge label="Neutral" tone="neutral" />
                  <StatusBadge label="Risk" tone="danger" />
                  <StatusBadge label="Warning" tone="warning" />
                  <StatusBadge label="Info" tone="info" />
                </HStack>
              </VStack>
            </GalleryCanvas>
          </div>
        </GallerySection>

        <GallerySection
          id="forms"
          title="Forms"
          description="Shared inputs, textareas, selects, and input controls using the stock component styles."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas roomy>
              <VStack>
                <Input
                  placeholder="Search inventory"
                  prefix={<Search className="h-4 w-4" />}
                />
                <Input
                  placeholder="Field with error"
                  error="This field is required."
                />
                <Textarea placeholder="Add implementation notes" />
                <Select
                  value="operations"
                  onChange={() => undefined}
                  options={[
                    { value: "operations", label: "Operations" },
                    { value: "warehouse", label: "Warehouse" },
                    { value: "finance", label: "Finance" },
                  ]}
                />
              </VStack>
            </GalleryCanvas>

            <GalleryCanvas>
              <VStack className="ui-gallery-tight-stack">
                <Checkbox defaultChecked label="Checkbox" />
                <Radio
                  name="demo-radio"
                  defaultChecked
                  label="Radio option A"
                />
                <Radio name="demo-radio" label="Radio option B" />
                <Toggle defaultChecked label="Enable notifications" />
              </VStack>
            </GalleryCanvas>
          </div>
        </GallerySection>

        <GallerySection
          id="feedback"
          title="Feedback"
          description="Alerts, loading states, empty states, and resilience helpers using the shared defaults."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas>
              <VStack className="ui-gallery-tight-stack">
                <Alert title="Info" variant="info">
                  Shared alerts now lean on tint and spacing instead of strong
                  outlines.
                </Alert>
                <Alert title="Success" variant="success">
                  This action completed successfully.
                </Alert>
                <Alert title="Warning" variant="warning">
                  Review this before publishing changes.
                </Alert>
                <Alert
                  title="Destructive"
                  variant="destructive"
                  dismissible
                  onDismiss={() => undefined}
                >
                  This cannot be undone.
                </Alert>
              </VStack>
            </GalleryCanvas>

            <GalleryCanvas>
              <VStack>
                <Progress value={38} showLabel />
                <Progress value={72} variant="success" />
                <HStack wrap>
                  <Skeleton width={120} height={16} />
                  <Skeleton width={160} height={16} />
                  <Skeleton width={40} height={40} rounded />
                </HStack>
                <HStack wrap>
                  <Spinner size="sm" />
                  <Spinner />
                  <Spinner size="lg" />
                  <DotPulse />
                </HStack>
              </VStack>
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <EmptyState
                title="No saved reports yet"
                description="Create one from the custom report builder to reuse it later."
              />
            </GalleryCanvas>

            <GalleryCanvas>
              <ErrorBoundary>
                <VStack className="ui-gallery-tight-stack">
                  <Body size="body5" muted>
                    The default error boundary fallback is shared too.
                  </Body>
                  <ErrorBoundaryCrashDemo />
                </VStack>
              </ErrorBoundary>
            </GalleryCanvas>
          </div>
        </GallerySection>

        <GallerySection
          id="data"
          title="Data"
          description="Shared avatars, tables, toolbars, breadcrumbs, and pagination."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas>
              <VStack className="ui-gallery-tight-stack">
                <Label>Avatar group</Label>
                <HStack wrap>
                  <Avatar fallback="JD" />
                  <Avatar fallback="AM" size="lg" />
                  <Avatar fallback="UX" size="xl" />
                </HStack>
                <AvatarGroup>
                  <Avatar fallback="OS" size="sm" />
                  <Avatar fallback="UI" size="sm" />
                  <Avatar fallback="+3" size="sm" />
                </AvatarGroup>
              </VStack>
            </GalleryCanvas>

            <GalleryCanvas>
              <VStack className="ui-gallery-tight-stack">
                <Label>Breadcrumb</Label>
                <Breadcrumb
                  items={[
                    { label: "Inventory", href: "#" },
                    { label: "Reports", href: "#" },
                    { label: "Stock Health" },
                  ]}
                />
              </VStack>
            </GalleryCanvas>
          </div>

          <GallerySubsection title="Inventory toolbar">
            <GalleryCanvas>
              <InventoryToolbarControls
                stockStatus={stockStatus}
                stockStatusOptions={stockStatusOptions}
                onStockStatusChange={setStockStatus}
                filterItems={filterItems}
                onFilterSelect={(value) =>
                  toast({
                    title: "Filter added",
                    message: `Selected ${value}.`,
                    variant: "info",
                  })
                }
                view={view}
                onViewChange={setView}
              />
            </GalleryCanvas>
          </GallerySubsection>

          <GallerySubsection title="Standalone toolbar controls">
            <GalleryCanvas>
              <HStack wrap justify="between">
                <HStack wrap>
                  <FilterDropdown
                    value={stockStatus}
                    options={stockStatusOptions}
                    onChange={setStockStatus}
                  />
                  <AddFilterDropdown
                    items={filterItems}
                    onSelect={(value) =>
                      toast({
                        title: "Filter added",
                        message: `Selected ${value}.`,
                        variant: "info",
                      })
                    }
                  />
                </HStack>
                <InventoryViewToggle value={view} onChange={setView} />
              </HStack>
            </GalleryCanvas>
          </GallerySubsection>

          <GallerySubsection title="Data table">
            <GalleryCanvas roomy>
              <DataTable
                columns={inventoryColumns}
                rows={pagedRows}
                getRowId={(row) => row.id}
                sortField={sortField}
                sortDirection={sortDirection}
                onSortChange={handleSort}
                topRow={tableTemplateRow}
                topRowClassName="bg-[var(--color-surface-subtle)]/75"
                topRowCellClassName="border-b border-[#d6d6d6] px-4 py-3"
                pagination={{
                  currentPage: tablePage,
                  totalItems: sortedRows.length,
                  itemsPerPage: tablePageSize,
                  onPageChange: setTablePage,
                  onItemsPerPageChange: (nextPageSize) => {
                    setTablePageSize(nextPageSize);
                    setTablePage(1);
                  },
                }}
              />
            </GalleryCanvas>
          </GallerySubsection>

          <div className="ui-gallery-grid ui-gallery-grid--wide">
            <GalleryCanvas roomy>
              <Table>
                <TableCaption>Shared table primitives</TableCaption>
                <TableHeader>
                  <TableRow>
                    <TableHead>Team</TableHead>
                    <TableHead>Owner</TableHead>
                    <TableHead>Updated</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Operations</TableCell>
                    <TableCell>Jordan Lee</TableCell>
                    <TableCell>Today</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Warehouse</TableCell>
                    <TableCell>Riley Patel</TableCell>
                    <TableCell>Yesterday</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <TableContainer>
                <table>
                  <thead>
                    <tr>
                      <th>Supplier</th>
                      <th>Lead time</th>
                      <th>Reliability</th>
                    </tr>
                  </thead>
                  <tbody>
                    <tr>
                      <td>Rowe Scientific</td>
                      <td>7 days</td>
                      <td>High</td>
                    </tr>
                    <tr>
                      <td>Livingstone</td>
                      <td>11 days</td>
                      <td>Medium</td>
                    </tr>
                  </tbody>
                </table>
              </TableContainer>
            </GalleryCanvas>
          </div>

          <GallerySubsection title="Standalone pagination">
            <GalleryCanvas>
              <Pagination
                currentPage={2}
                totalPages={8}
                totalItems={156}
                itemsPerPage={20}
                onPageChange={() => undefined}
                onItemsPerPageChange={() => undefined}
              />
            </GalleryCanvas>
          </GallerySubsection>
        </GallerySection>

        <GallerySection
          id="overlays"
          title="Overlays"
          description="Dropdowns, tooltips, dialogs, and side sheets using the shared surface treatment."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas>
              <HStack wrap>
                <Tooltip content="Shared tooltip">
                  <Button type="button" variant="ghost">
                    Hover tooltip
                  </Button>
                </Tooltip>

                <Dropdown
                  trigger={
                    <Button type="button" variant="outline">
                      Dropdown
                    </Button>
                  }
                >
                  <DropdownItem icon={<Settings className="h-4 w-4" />}>
                    Settings
                  </DropdownItem>
                  <DropdownItem icon={<Download className="h-4 w-4" />}>
                    Export
                  </DropdownItem>
                  <DropdownSeparator />
                  <DropdownItem destructive>Delete</DropdownItem>
                </Dropdown>

                <DropdownMenu
                  trigger={
                    <Button type="button" variant="outline">
                      Menu API
                    </Button>
                  }
                  items={[
                    {
                      label: "Export CSV",
                      icon: <Download className="h-4 w-4" />,
                    },
                    {
                      label: "Open report",
                      icon: <FileText className="h-4 w-4" />,
                    },
                    { divider: true, label: "" },
                    { label: "Archive", variant: "destructive" },
                  ]}
                />
              </HStack>
            </GalleryCanvas>

            <GalleryCanvas>
              <HStack wrap>
                <Button type="button" onClick={() => setDialogOpen(true)}>
                  Open dialog
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSheetOpen(true)}
                >
                  Open side sheet
                </Button>
              </HStack>
            </GalleryCanvas>
          </div>

          <Dialog open={dialogOpen} onClose={() => setDialogOpen(false)}>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Shared dialog</DialogTitle>
                <DialogDescription>
                  Dialog surfaces are still elevated, but they no longer rely on
                  a hard border.
                </DialogDescription>
              </DialogHeader>
              <VStack className="ui-gallery-tight-stack">
                <Input placeholder="Report name" />
                <Textarea placeholder="Description" />
              </VStack>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => setDialogOpen(false)}>
                  Save
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>

          <SideSheet
            open={sheetOpen}
            onClose={() => setSheetOpen(false)}
            size="page"
          >
            <SideSheetContent>
              <SideSheetHeader>
                <SideSheetTitle>Shared side sheet</SideSheetTitle>
                <SideSheetDescription>
                  Sheets follow the same border-light treatment as dialogs.
                </SideSheetDescription>
              </SideSheetHeader>
              <SideSheetBody>
                <VStack>
                  <Input placeholder="Team name" />
                  <Textarea placeholder="Notes" />
                </VStack>
              </SideSheetBody>
              <SideSheetFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSheetOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="button" onClick={() => setSheetOpen(false)}>
                  Save
                </Button>
              </SideSheetFooter>
            </SideSheetContent>
          </SideSheet>
        </GallerySection>

        <GallerySection
          id="navigation"
          title="Navigation"
          description="Shared tabs, accordions, nav lists, top bars, and profile affordances."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas>
              <VStack>
                <TabBar
                  tabs={[
                    { id: "overview", label: "Overview" },
                    { id: "activity", label: "Activity", count: 12 },
                    { id: "suppliers", label: "Suppliers" },
                  ]}
                  activeTab={tab}
                  onTabChange={setTab}
                />
                <AccordionItem title="Accordion item" defaultOpen>
                  This is the shared accordion item in its flatter default
                  style.
                </AccordionItem>
              </VStack>
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <div className="ui-gallery-nav-showcase">
                <Sidebar
                  header={<Heading level="h5">Workspace</Heading>}
                  footer={
                    <Body size="body5" muted>
                      2 teams active
                    </Body>
                  }
                  collapsible={false}
                >
                  <SidebarSection title="Shared Sidebar">
                    <SidebarItem icon={<Boxes className="h-4 w-4" />} active>
                      Inventory
                    </SidebarItem>
                    <SidebarItem icon={<BarChart3 className="h-4 w-4" />}>
                      Reports
                    </SidebarItem>
                    <SidebarItem icon={<Bell className="h-4 w-4" />}>
                      Alerts
                    </SidebarItem>
                  </SidebarSection>
                </Sidebar>

                <div className="ui-gallery-side-nav-shell">
                  <SideNavBrandSlot
                    icon={<Palette className="h-5 w-5" />}
                    name="Shared UI"
                    version="Preview"
                  />
                  <SideNav>
                    <SideNavGroupList>
                      <SideNavGroup category="main">
                        <SideNavItem active>
                          <Workflow className="h-4 w-4" />
                          Dashboard
                        </SideNavItem>
                        <SideNavItem>
                          <Boxes className="h-4 w-4" />
                          Inventory
                        </SideNavItem>
                      </SideNavGroup>
                    </SideNavGroupList>
                  </SideNav>
                  <SideNavUserProfile
                    userName="Jordan Lee"
                    userEmail="jordan@example.com"
                  />
                </div>
              </div>
            </GalleryCanvas>
          </div>

          <div className="ui-gallery-grid ui-gallery-grid--wide">
            <GalleryCanvas roomy>
              <TopBar
                searchPlaceholder="Search items..."
                searchValue="PCR tubes"
                onSearchChange={() => undefined}
                profileFallback="JL"
              />
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <VStack className="ui-gallery-tight-stack">
                <SwitchAppTopBar profileFallback="UI" />
                <Body size="body5" muted>
                  Open the menu button to inspect the shared SwitchAppPopover.
                </Body>
              </VStack>
            </GalleryCanvas>
          </div>

          <GalleryCanvas>
            <HStack wrap justify="between">
              <ProfileDropdown
                profileFallback="JD"
                onSettingsClick={() =>
                  toast({
                    title: "Settings",
                    message: "ProfileDropdown action.",
                    variant: "info",
                  })
                }
                onLogout={() =>
                  toast({
                    title: "Log out",
                    message: "ProfileDropdown action.",
                    variant: "default",
                  })
                }
              />
              <HStack wrap>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => navigate("/preview/landing-navbar")}
                >
                  Open Landing Navbar preview
                </Button>
              </HStack>
            </HStack>
          </GalleryCanvas>
        </GallerySection>

        <GallerySection
          id="layout"
          title="Layout"
          description="Shared layout containers and page scaffolds, shown without app-specific skinning."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas roomy>
              <StackLayout variant="grid-2">
                <Card>
                  <CardHeader>
                    <CardTitle>StackLayout</CardTitle>
                    <CardDescription>
                      The grid variant arranges children responsively.
                    </CardDescription>
                  </CardHeader>
                </Card>
                <Card>
                  <CardHeader>
                    <CardTitle>Container</CardTitle>
                    <CardDescription>
                      The page itself is inside the shared Container.
                    </CardDescription>
                  </CardHeader>
                </Card>
              </StackLayout>
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <BasePage>
                <AnalyticsMetricGrid variant="stats-2">
                  <AnalyticsMetricCard label="Open alerts" value="12" />
                  <AnalyticsMetricCard label="Saved reports" value="8" />
                </AnalyticsMetricGrid>
              </BasePage>
            </GalleryCanvas>
          </div>
        </GallerySection>

        <GallerySection
          id="analytics"
          title="Analytics"
          description="The shared dashboard-style analytics layer now acts as the single source of truth for StoQR visuals."
        >
          <AnalyticsMetricGrid variant="stats-4">
            <AnalyticsMetricCard
              label="Stock value"
              value="$128k"
              accent={{ label: "+8.2%", direction: "up", tone: "positive" }}
              detail="vs last month"
              visual={
                <AnalyticsMiniSparkline
                  data={[3, 4, 5, 4, 7, 8]}
                  color="#899b50"
                />
              }
            />
            <AnalyticsMetricCard
              label="Out of stock"
              value="14"
              accent={{ label: "Needs attention", tone: "danger" }}
            />
            <AnalyticsMetricCard
              label="POs delayed"
              value="9"
              accent={{ label: "2 this week", tone: "warning" }}
            />
            <AnalyticsMetricCard
              label="Item velocity"
              value="Fast"
              detail="Most movement from PCR consumables"
            />
          </AnalyticsMetricGrid>

          <div className="ui-gallery-analytics-grid">
            <AnalyticsPanel
              title="Inbound vs outbound"
              subtitle="Shared line chart"
              headerAside={
                <AnalyticsLegend
                  items={[
                    { label: "Inbound", color: "#899b50" },
                    { label: "Outbound", color: "#d4a373" },
                  ]}
                />
              }
            >
              <AnalyticsLineChart
                data={analyticsTrendData}
                xDataKey="month"
                series={[
                  { dataKey: "inbound", label: "Inbound", color: "#899b50" },
                  { dataKey: "outbound", label: "Outbound", color: "#d4a373" },
                ]}
              />
            </AnalyticsPanel>

            <div className="ui-gallery-grid ui-gallery-grid--wide">
              <AnalyticsPanel
                title="Reorder trend"
                subtitle="Shared area chart"
              >
                <AnalyticsAreaChart
                  data={analyticsAreaData}
                  xDataKey="week"
                  series={[
                    { dataKey: "value", label: "Value", color: "#899b50" },
                  ]}
                />
              </AnalyticsPanel>

              <AnalyticsPanel
                title="Units by folder"
                subtitle="Shared bar chart"
              >
                <AnalyticsBarChart
                  data={analyticsBarData}
                  categoryKey="label"
                  series={[
                    { dataKey: "units", label: "Units", color: "#d4a373" },
                  ]}
                />
              </AnalyticsPanel>
            </div>

            <div className="ui-gallery-grid ui-gallery-grid--wide">
              <AnalyticsPanel
                title="Stock mix"
                subtitle="Shared donut chart"
                headerAside={
                  <AnalyticsLegend
                    muted
                    items={[
                      { label: "In Stock", color: "#899b50", shape: "dot" },
                      { label: "Low Stock", color: "#d4a373", shape: "dot" },
                      { label: "Out of Stock", color: "#dc2626", shape: "dot" },
                    ]}
                  />
                }
              >
                <AnalyticsDonutChart
                  data={analyticsDonutData}
                  colors={["#899b50", "#d4a373", "#dc2626"]}
                />
              </AnalyticsPanel>

              <AnalyticsPanel
                title="Movement comparison"
                subtitle="Custom grouped comparison bars"
              >
                <AnalyticsComparisonBars
                  data={analyticsComparisonData}
                  labelKey="label"
                  ariaLabel="Inbound vs outbound by day"
                  series={[
                    { dataKey: "inbound", label: "Inbound", color: "#899b50" },
                    {
                      dataKey: "outbound",
                      label: "Outbound",
                      color: "#d4a373",
                    },
                  ]}
                />
              </AnalyticsPanel>
            </div>

            <AnalyticsTablePanel
              title="Actionable alerts"
              subtitle="Shared table shell"
            >
              <DataTable
                columns={[
                  {
                    id: "name",
                    header: "Alert",
                    renderCell: (row: AnalyticsAlertRow) => row.name,
                  },
                  {
                    id: "severity",
                    header: "Severity",
                    renderCell: (row: AnalyticsAlertRow) => row.severity,
                  },
                  {
                    id: "owner",
                    header: "Owner",
                    renderCell: (row: AnalyticsAlertRow) => row.owner,
                  },
                ]}
                rows={[
                  {
                    name: "Low stock on PCR-001",
                    severity: "High",
                    owner: "Jordan",
                  },
                  {
                    name: "Delayed PO-3018",
                    severity: "Medium",
                    owner: "Riley",
                  },
                ]}
                getRowId={(row) => row.name}
                variant="dashboard"
              />
            </AnalyticsTablePanel>

            <div className="ui-gallery-grid">
              <GalleryCanvas>
                <AnalyticsEmptyPanel message="No movement history available." />
              </GalleryCanvas>
              <GalleryCanvas>
                <AnalyticsMiniSparkline
                  data={[2, 4, 3, 7, 8, 6]}
                  color="#899b50"
                />
              </GalleryCanvas>
            </div>
          </div>
        </GallerySection>

        <GallerySection
          id="organisation"
          title="Organisation"
          description="Shared team and permissions components with local mock state instead of app-specific wrappers."
        >
          <div className="ui-gallery-grid">
            <GalleryCanvas roomy>
              <OrganisationTeamsShell
                toolbar={
                  <Body size="body5" muted>
                    OrganisationTeamsShell toolbar slot
                  </Body>
                }
                primaryContent={
                  <OrganisationMembersTable rows={memberRows} showStatus />
                }
                secondaryContent={
                  <AnalyticsMetricGrid variant="stats-2">
                    <AnalyticsMetricCard
                      label="Members"
                      value={members.length}
                    />
                    <AnalyticsMetricCard label="Roles" value={roles.length} />
                  </AnalyticsMetricGrid>
                }
              />
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <OrganisationTeamsPage
                filterValue={teamFilter}
                onFilterChange={setTeamFilter}
                filterOptions={[
                  { value: "all", label: "All Roles" },
                  ...teamRoles.map((role) => ({
                    value: role.id,
                    label: role.name,
                  })),
                ]}
                canManageTeam
                onInviteClick={() =>
                  toast({
                    title: "Invite flow",
                    message: "Teams page action.",
                    variant: "info",
                  })
                }
                inviteIcon={<UserPlus className="h-4 w-4" />}
                tableContent={
                  <OrganisationMembersTable rows={memberRows} showStatus />
                }
              />
            </GalleryCanvas>
          </div>

          <div className="ui-gallery-stack">
            <GalleryCanvas roomy>
              <OrganisationTeamsTab
                members={members}
                roles={teamRoles}
                canManageTeam
                roleChangeMessage={roleChangeMessage}
                onRoleChange={async (memberId, roleId) => {
                  setMembers((current) =>
                    current.map((member) =>
                      member.id === memberId ? { ...member, roleId } : member,
                    ),
                  );
                  setRoleChangeMessage(
                    `Updated ${memberId} to ${teamRoles.find((role) => role.id === roleId)?.name ?? roleId}.`,
                  );
                }}
                onInvite={(email, roleId) =>
                  setMembers((current) => [
                    ...current,
                    {
                      id: `member-${current.length + 1}`,
                      displayName: email.split("@")[0],
                      subtitle: email,
                      roleId,
                      initials: email.slice(0, 2).toUpperCase(),
                    },
                  ])
                }
              />
            </GalleryCanvas>

            <GalleryCanvas roomy>
              <OrganisationPermissionsPanel
                roles={roles}
                permissions={permissionCatalog}
                canManage
                isRoleEditable={(role) => role.id !== "role-owner"}
                onCreateRole={async (payload) => {
                  setRoles((current) => [
                    ...current,
                    {
                      id: `role-${current.length + 1}`,
                      name: payload.name,
                      description: payload.description,
                      roleRank: payload.roleRank,
                      permissionCodes: payload.permissionCodes,
                    },
                  ]);
                }}
                onUpdateRole={async (roleId, payload) => {
                  setRoles((current) =>
                    current.map((role) =>
                      role.id === roleId
                        ? {
                            ...role,
                            name: payload.name,
                            description: payload.description,
                            roleRank: payload.roleRank,
                            permissionCodes: payload.permissionCodes,
                          }
                        : role,
                    ),
                  );
                }}
                onDeleteRole={async (roleId) => {
                  setRoles((current) =>
                    current.filter((role) => role.id !== roleId),
                  );
                }}
              />
            </GalleryCanvas>
          </div>
        </GallerySection>
      </VStack>
    </Container>
  );
}
