import { useMemo, useState } from 'react'
import {
  DataTable,
  Button,
  Tooltip,
  Body,
  Badge,
  Avatar,
  AvatarGroup,
  Card,
  Container,
  VStack,
  HStack,
  Table,
  TableBody,
  TableCaption,
  TableCell,
  TableContainer,
  TableHead,
  TableHeader,
  TableRow,
  Pagination,
  FilterDropdown,
  AddFilterDropdown,
  InventoryViewToggle,
  InventoryToolbarControls,
} from '../components/ui'
import type { DataTableTopRowConfig } from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

type PurchaseOrderStatus = 'Delayed' | 'Pending' | 'On track'

type PurchaseOrderSortField = 'poNumber' | 'vendor' | 'items' | 'value' | 'expected' | 'status'
type PurchaseOrderFilter = 'all' | PurchaseOrderStatus

type PurchaseOrderRow = {
  poNumber: string
  vendor: string
  items: number
  value: number
  expectedLabel: string
  expectedSortValue: number
  status: PurchaseOrderStatus
}

const purchaseOrderSeedRows: PurchaseOrderRow[] = [
  { poNumber: 'PO-3009', vendor: 'Rowe Scientific', items: 31, value: 547, expectedLabel: '61 days overdue', expectedSortValue: -61, status: 'Delayed' },
  { poNumber: 'PO-3018', vendor: 'Livingstone', items: 45, value: 1341, expectedLabel: '52 days overdue', expectedSortValue: -52, status: 'Delayed' },
  { poNumber: 'PO-3027', vendor: 'Livingstone', items: 59, value: 2475, expectedLabel: '43 days overdue', expectedSortValue: -43, status: 'Delayed' },
  { poNumber: 'PO-3036', vendor: 'Roche', items: 24, value: 1298, expectedLabel: '34 days overdue', expectedSortValue: -34, status: 'Delayed' },
  { poNumber: 'PO-3045', vendor: 'Mektronics', items: 38, value: 2518, expectedLabel: '25 days overdue', expectedSortValue: -25, status: 'Delayed' },
  { poNumber: 'PO-1204', vendor: 'Textile Wonders', items: 48, value: 288, expectedLabel: 'In 4 days', expectedSortValue: 4, status: 'Pending' },
  { poNumber: 'PO-3122', vendor: 'Helix Bio', items: 16, value: 912, expectedLabel: 'In 9 days', expectedSortValue: 9, status: 'On track' },
  { poNumber: 'PO-3148', vendor: 'North Lab Supply', items: 27, value: 1640, expectedLabel: 'In 12 days', expectedSortValue: 12, status: 'On track' },
  { poNumber: 'PO-3161', vendor: 'ThermoGene', items: 52, value: 3011, expectedLabel: 'In 16 days', expectedSortValue: 16, status: 'Pending' },
  { poNumber: 'PO-3174', vendor: 'Apex Medical', items: 33, value: 1185, expectedLabel: 'In 21 days', expectedSortValue: 21, status: 'On track' },
]

const formatExpectedLabel = (expectedSortValue: number) => {
  if (expectedSortValue < 0) {
    return `${Math.abs(expectedSortValue)} days overdue`
  }

  return `In ${expectedSortValue} days`
}

const getPurchaseOrderStatus = (expectedSortValue: number): PurchaseOrderStatus => {
  if (expectedSortValue < 0) {
    return 'Delayed'
  }

  if (expectedSortValue <= 10) {
    return 'Pending'
  }

  return 'On track'
}

const purchaseOrderRows: PurchaseOrderRow[] = Array.from({ length: 49 }, (_, index) => {
  if (index < purchaseOrderSeedRows.length) {
    return purchaseOrderSeedRows[index]
  }

  const template = purchaseOrderSeedRows[index % purchaseOrderSeedRows.length]
  const offset = index - purchaseOrderSeedRows.length + 1
  const expectedSortValue = template.expectedSortValue + ((offset % 9) - 4)

  return {
    poNumber: `PO-${3180 + offset}`,
    vendor: template.vendor,
    items: Math.max(8, template.items + ((offset % 7) - 3) * 2),
    value: template.value + offset * 87,
    expectedSortValue,
    expectedLabel: formatExpectedLabel(expectedSortValue),
    status: getPurchaseOrderStatus(expectedSortValue),
  }
})

const purchaseOrderValueFormatter = new Intl.NumberFormat('en-US', {
  style: 'currency',
  currency: 'USD',
  maximumFractionDigits: 0,
})

const extractPurchaseOrderNumber = (poNumber: string) => Number(poNumber.replace(/[^0-9]/g, ''))

const getPurchaseOrderStatusClassName = (status: PurchaseOrderStatus) => {
  switch (status) {
    case 'Delayed':
      return 'text-[#ff4d4f]'
    case 'Pending':
      return 'text-[#f59e0b]'
    default:
      return 'text-[#0f766e]'
  }
}

const comparePurchaseOrders = (
  left: PurchaseOrderRow,
  right: PurchaseOrderRow,
  field: PurchaseOrderSortField,
) => {
  switch (field) {
    case 'poNumber':
      return extractPurchaseOrderNumber(left.poNumber) - extractPurchaseOrderNumber(right.poNumber)
    case 'vendor':
      return left.vendor.localeCompare(right.vendor)
    case 'items':
      return left.items - right.items
    case 'value':
      return left.value - right.value
    case 'expected':
      return left.expectedSortValue - right.expectedSortValue
    case 'status':
      return left.status.localeCompare(right.status)
    default:
      return 0
  }
}

const stockStatusOptions = [
  { value: 'all', label: 'All Statuses' },
  { value: 'low', label: 'Low Stock' },
  { value: 'out', label: 'Out of Stock' },
]

const addFilterItems = [
  { value: 'location', label: 'Location' },
  { value: 'batch', label: 'Batch' },
  { value: 'supplier', label: 'Supplier' },
]

const getOptionLabel = (options: { value: string; label: string }[], value: string) =>
  options.find((option) => option.value === value)?.label ?? value

const tableFilterOptions: Array<{ value: PurchaseOrderFilter; label: string }> = [
  { value: 'all', label: 'All' },
  { value: 'Delayed', label: 'Delayed' },
  { value: 'Pending', label: 'Pending' },
  { value: 'On track', label: 'On track' },
]

export function DataDisplayPage() {
  const [stockStatus, setStockStatus] = useState(stockStatusOptions[0].value)
  const [nextFilterField, setNextFilterField] = useState(addFilterItems[0].label)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [combinedStockStatus, setCombinedStockStatus] = useState(stockStatusOptions[0].value)
  const [combinedNextFilterField, setCombinedNextFilterField] = useState(addFilterItems[0].label)
  const [combinedView, setCombinedView] = useState<'list' | 'grid'>('list')
  const [tableFilter, setTableFilter] = useState<PurchaseOrderFilter>('all')
  const [tablePage, setTablePage] = useState(1)
  const [tablePageSize, setTablePageSize] = useState(10)
  const [tableSortField, setTableSortField] = useState<PurchaseOrderSortField | null>(null)
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')
  const [standalonePage, setStandalonePage] = useState(1)

  const filteredTableRows = useMemo(() => {
    if (tableFilter === 'all') {
      return purchaseOrderRows
    }

    return purchaseOrderRows.filter((row) => row.status === tableFilter)
  }, [tableFilter])

  const sortedTableRows = useMemo(() => {
    if (!tableSortField) {
      return filteredTableRows
    }

    return [...filteredTableRows].sort((left, right) => {
      const comparison = comparePurchaseOrders(left, right, tableSortField)
      return tableSortDirection === 'asc' ? comparison : -comparison
    })
  }, [filteredTableRows, tableSortDirection, tableSortField])

  const pagedTableRows = useMemo(() => {
    const startIndex = (tablePage - 1) * tablePageSize
    return sortedTableRows.slice(startIndex, startIndex + tablePageSize)
  }, [sortedTableRows, tablePage, tablePageSize])

  const handleTableSort = (field: PurchaseOrderSortField) => {
    if (tableSortField === field) {
      setTableSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setTableSortField(field)
    setTableSortDirection('asc')
    setTablePage(1)
  }

  const handlePageSizeChange = (pageSize: number) => {
    setTablePageSize(pageSize)
    setTablePage(1)
  }

  const handleTableFilterChange = (filter: PurchaseOrderFilter) => {
    setTableFilter(filter)
    setTablePage(1)
  }

  const tableTopRow: DataTableTopRowConfig = {
    left: (
      <>
        {tableFilterOptions.map((option) => (
          <Button
            key={option.value}
            type="button"
            variant={tableFilter === option.value ? 'secondary' : 'ghost'}
            size="xs"
            onClick={() => handleTableFilterChange(option.value)}
          >
            {option.label}
          </Button>
        ))}
      </>
    ),
    right: (
      <Badge variant="secondary" size="sm">
        {filteredTableRows.length} orders
      </Badge>
    ),
  }

  return (
    <Container size="lg" className="py-8">
      <Section title="Data Display">
        <SubSection title="Avatars">
          <HStack wrap align="center">
            <Avatar size="xs" fallback="XS" />
            <Avatar size="sm" fallback="SM" />
            <Avatar size="md" alt="John Doe" fallback="JD" />
            <Avatar size="lg" alt="Jane Smith" fallback="JS" />
            <Avatar size="xl" alt="Admin" fallback="A" />
          </HStack>
          <Body size="body5" muted className="mt-2">
            Avatar Group:
          </Body>
          <AvatarGroup>
            <Avatar size="sm" fallback="A" className="ring-2 ring-[var(--color-background)]" />
            <Avatar size="sm" fallback="B" className="ring-2 ring-[var(--color-background)]" />
            <Avatar size="sm" fallback="C" className="ring-2 ring-[var(--color-background)]" />
            <Avatar size="sm" fallback="+3" className="ring-2 ring-[var(--color-background)]" />
          </AvatarGroup>
        </SubSection>

        <SubSection title="Table">
          <Card padding="none" className="overflow-hidden rounded-[26px] border-0 bg-white shadow-none">
            <DataTable
              columns={[
                {
                  id: 'poNumber',
                  header: 'PO Number',
                  sortKey: 'poNumber',
                  width: '18%',
                  renderCell: (row: PurchaseOrderRow) => row.poNumber,
                },
                {
                  id: 'vendor',
                  header: 'Vendor',
                  sortKey: 'vendor',
                  width: '22%',
                  renderCell: (row: PurchaseOrderRow) => row.vendor,
                },
                {
                  id: 'items',
                  header: 'Items',
                  sortKey: 'items',
                  width: '11%',
                  renderCell: (row: PurchaseOrderRow) => row.items,
                },
                {
                  id: 'value',
                  header: 'Value',
                  sortKey: 'value',
                  width: '12%',
                  renderCell: (row: PurchaseOrderRow) => purchaseOrderValueFormatter.format(row.value),
                },
                {
                  id: 'expected',
                  header: 'Expected',
                  sortKey: 'expected',
                  width: '23%',
                  renderCell: (row: PurchaseOrderRow) => row.expectedLabel,
                },
                {
                  id: 'status',
                  header: 'Status',
                  sortKey: 'status',
                  width: '14%',
                  renderCell: (row: PurchaseOrderRow) => (
                    <span className={getPurchaseOrderStatusClassName(row.status)}>
                      {row.status}
                    </span>
                  ),
                },
              ]}
              rows={pagedTableRows}
              getRowId={(row) => row.poNumber}
              minTableWidth={860}
              topRow={tableTopRow}
              sortField={tableSortField}
              sortDirection={tableSortDirection}
              onSortChange={handleTableSort}
              pagination={{
                currentPage: tablePage,
                totalItems: filteredTableRows.length,
                itemsPerPage: tablePageSize,
                onPageChange: setTablePage,
                onItemsPerPageChange: handlePageSizeChange,
                pageSizeOptions: [10, 20, 30, 50],
              }}
            />
          </Card>
        </SubSection>

        <SubSection title="Table Primitives">
          <VStack>
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

            <TableContainer>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Metric</TableHead>
                    <TableHead className="text-right">Value</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  <TableRow>
                    <TableCell>Open orders</TableCell>
                    <TableCell className="text-right">49</TableCell>
                  </TableRow>
                  <TableRow>
                    <TableCell>Late orders</TableCell>
                    <TableCell className="text-right">5</TableCell>
                  </TableRow>
                </TableBody>
              </Table>
            </TableContainer>
          </VStack>
        </SubSection>

        <SubSection title="Pagination">
          <Card>
            <Pagination
              currentPage={standalonePage}
              totalPages={12}
              totalItems={118}
              itemsPerPage={10}
              onPageChange={setStandalonePage}
            />
          </Card>
        </SubSection>

        <SubSection title="Tooltip">
          <HStack>
            <Tooltip content="Top tooltip" side="top">
              <Button variant="outline" size="sm">
                Top
              </Button>
            </Tooltip>
            <Tooltip content="Bottom tooltip" side="bottom">
              <Button variant="outline" size="sm">
                Bottom
              </Button>
            </Tooltip>
            <Tooltip content="Left tooltip" side="left">
              <Button variant="outline" size="sm">
                Left
              </Button>
            </Tooltip>
            <Tooltip content="Right tooltip" side="right">
              <Button variant="outline" size="sm">
                Right
              </Button>
            </Tooltip>
          </HStack>
        </SubSection>

        <SubSection title="Inventory Toolbar Controls">
          <VStack>
            <Card>
              <HStack wrap align="start" className="gap-6">
                <VStack className="min-w-[180px] gap-2">
                  <Body size="body5" muted>
                    Stock status filter
                  </Body>
                  <FilterDropdown
                    value={stockStatus}
                    options={stockStatusOptions}
                    onChange={setStockStatus}
                  />
                  <Body size="body5" muted>
                    Selected: {getOptionLabel(stockStatusOptions, stockStatus)}
                  </Body>
                </VStack>

                <VStack className="min-w-[180px] gap-2">
                  <Body size="body5" muted>
                    Add filter button
                  </Body>
                  <AddFilterDropdown
                    items={addFilterItems}
                    onSelect={(value) => setNextFilterField(getOptionLabel(addFilterItems, value))}
                  />
                  <Body size="body5" muted>
                    Next field: {nextFilterField}
                  </Body>
                </VStack>

                <VStack className="min-w-[180px] gap-2">
                  <Body size="body5" muted>
                    View toggle
                  </Body>
                  <InventoryViewToggle value={view} onChange={setView} />
                  <Body size="body5" muted>
                    Active view: {view === 'list' ? 'List view' : 'Module view'}
                  </Body>
                </VStack>
              </HStack>
            </Card>

            <Card>
              <VStack className="gap-3">
                <Body size="body5" muted>
                  Combined toolbar controls
                </Body>
                <InventoryToolbarControls
                  stockStatus={combinedStockStatus}
                  stockStatusOptions={stockStatusOptions}
                  onStockStatusChange={setCombinedStockStatus}
                  filterItems={addFilterItems}
                  onFilterSelect={(value) =>
                    setCombinedNextFilterField(getOptionLabel(addFilterItems, value))
                  }
                  view={combinedView}
                  onViewChange={setCombinedView}
                />
                <Body size="body5" muted>
                  Status: {getOptionLabel(stockStatusOptions, combinedStockStatus)}. Next field:{' '}
                  {combinedNextFilterField}. View:{' '}
                  {combinedView === 'list' ? 'List view' : 'Module view'}.
                </Body>
              </VStack>
            </Card>
          </VStack>
        </SubSection>
      </Section>
    </Container>
  )
}
