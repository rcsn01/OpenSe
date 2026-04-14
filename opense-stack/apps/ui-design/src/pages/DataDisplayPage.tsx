import { useMemo, useState } from 'react'
import {
  DataTable,
  Button,
  Tooltip,
  Badge,
  Body,
  Avatar,
  AvatarGroup,
  Card,
  Container,
  VStack,
  HStack,
  StockStatusFilterDropdown,
  AddFilterDropdown,
  InventoryViewToggle,
  InventoryToolbarControls,
} from '../components/ui'
import { Section, SubSection } from '../components/shared/PageSection'

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

export function DataDisplayPage() {
  const [stockStatus, setStockStatus] = useState(stockStatusOptions[0].value)
  const [nextFilterField, setNextFilterField] = useState(addFilterItems[0].label)
  const [view, setView] = useState<'list' | 'grid'>('list')
  const [combinedStockStatus, setCombinedStockStatus] = useState(stockStatusOptions[0].value)
  const [combinedNextFilterField, setCombinedNextFilterField] = useState(addFilterItems[0].label)
  const [combinedView, setCombinedView] = useState<'list' | 'grid'>('list')
  const [tablePage, setTablePage] = useState(1)
  const [tableSortField, setTableSortField] = useState<'name' | 'status' | 'role' | 'email'>('name')
  const [tableSortDirection, setTableSortDirection] = useState<'asc' | 'desc'>('asc')

  const tableRows = useMemo(
    () => [
      { name: 'Alice Johnson', status: 'Active', role: 'Admin', email: 'alice@example.com' },
      { name: 'Bob Smith', status: 'Inactive', role: 'Editor', email: 'bob@example.com' },
      { name: 'Carol Williams', status: 'Active', role: 'Viewer', email: 'carol@example.com' },
      { name: 'Danielle Brooks', status: 'Active', role: 'Manager', email: 'danielle@example.com' },
      { name: 'Elliot Cruz', status: 'Pending', role: 'Contributor', email: 'elliot@example.com' },
      { name: 'Farah Khan', status: 'Active', role: 'Viewer', email: 'farah@example.com' },
    ],
    [],
  )

  const sortedTableRows = useMemo(() => {
    return [...tableRows].sort((left, right) => {
      const leftValue = left[tableSortField]
      const rightValue = right[tableSortField]
      const comparison = leftValue.localeCompare(rightValue)
      return tableSortDirection === 'asc' ? comparison : -comparison
    })
  }, [tableRows, tableSortDirection, tableSortField])

  const pageSize = 3
  const pagedTableRows = useMemo(() => {
    const startIndex = (tablePage - 1) * pageSize
    return sortedTableRows.slice(startIndex, startIndex + pageSize)
  }, [sortedTableRows, tablePage])

  const handleTableSort = (field: 'name' | 'status' | 'role' | 'email') => {
    if (tableSortField === field) {
      setTableSortDirection((current) => current === 'asc' ? 'desc' : 'asc')
      return
    }

    setTableSortField(field)
    setTableSortDirection('asc')
    setTablePage(1)
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
          <Card padding="none">
            <DataTable
              columns={[
                {
                  id: 'name',
                  header: 'Name',
                  sortKey: 'name',
                  renderCell: (row: (typeof pagedTableRows)[number]) => row.name,
                },
                {
                  id: 'status',
                  header: 'Status',
                  sortKey: 'status',
                  renderCell: (row: (typeof pagedTableRows)[number]) => (
                    <Badge
                      variant={row.status === 'Active' ? 'success' : row.status === 'Pending' ? 'warning' : 'secondary'}
                      size="sm"
                    >
                      {row.status}
                    </Badge>
                  ),
                },
                {
                  id: 'role',
                  header: 'Role',
                  sortKey: 'role',
                  renderCell: (row: (typeof pagedTableRows)[number]) => row.role,
                },
                {
                  id: 'email',
                  header: 'Email',
                  sortKey: 'email',
                  renderCell: (row: (typeof pagedTableRows)[number]) => (
                    <Body size="body4" muted>
                      {row.email}
                    </Body>
                  ),
                },
              ]}
              rows={pagedTableRows}
              getRowId={(row) => row.email}
              sortField={tableSortField}
              sortDirection={tableSortDirection}
              onSortChange={handleTableSort}
              pagination={{
                currentPage: tablePage,
                totalItems: tableRows.length,
                itemsPerPage: pageSize,
                onPageChange: setTablePage,
              }}
              footerClassName="px-4 pb-4 pt-0"
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
                  <StockStatusFilterDropdown
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
