import { type ReactNode, useMemo, useState } from 'react'
import { DataTable, type DataTableColumn } from '../ui/DataTable'

type OrganisationMembersSortField = 'member' | 'role' | 'permissions-role' | 'status'

export type OrganisationMembersTableRow = {
  id: string
  displayName: string
  subtitle: string
  initials?: string
  roleContent: ReactNode
  roleSortValue?: string
  permissionsRoleContent?: ReactNode
  permissionsRoleSortValue?: string
  statusContent?: ReactNode
  statusSortValue?: string
  actionsContent?: ReactNode
}

type OrganisationMembersTableProps = {
  rows: OrganisationMembersTableRow[]
  showPermissionsRole?: boolean
  showStatus?: boolean
  showActions?: boolean
  containerClassName?: string
}

export function OrganisationMembersTable({
  rows,
  showPermissionsRole = false,
  showStatus = false,
  showActions = false,
  containerClassName = 'flex min-h-0 flex-1 overflow-hidden',
}: OrganisationMembersTableProps) {
  const [sortField, setSortField] = useState<OrganisationMembersSortField | null>(null)
  const [sortDirection, setSortDirection] = useState<'asc' | 'desc'>('asc')

  const headerClassName = 'border-b border-[#d9e2ef] bg-white px-4 py-4 uppercase'
  const cellClassName = 'border-b border-[#d9e2ef] px-4 py-3 whitespace-nowrap'
  const hasRoleSortValues = rows.some((row) => row.roleSortValue)
  const hasPermissionsRoleSortValues = rows.some((row) => row.permissionsRoleSortValue)
  const hasStatusSortValues = rows.some((row) => row.statusSortValue)

  const sortedRows = useMemo(() => {
    if (!sortField) {
      return rows
    }

    const getSortValue = (row: OrganisationMembersTableRow) => {
      switch (sortField) {
        case 'member':
          return row.displayName
        case 'role':
          return row.roleSortValue ?? ''
        case 'permissions-role':
          return row.permissionsRoleSortValue ?? ''
        case 'status':
          return row.statusSortValue ?? ''
        default:
          return ''
      }
    }

    return [...rows].sort((a, b) => {
      const first = getSortValue(a).toLowerCase()
      const second = getSortValue(b).toLowerCase()
      const comparison = first.localeCompare(second, undefined, { numeric: true, sensitivity: 'base' })

      return sortDirection === 'asc' ? comparison : -comparison
    })
  }, [rows, sortDirection, sortField])

  const handleSortChange = (nextSortField: OrganisationMembersSortField) => {
    if (sortField === nextSortField) {
      setSortDirection((currentDirection) => (currentDirection === 'asc' ? 'desc' : 'asc'))
      return
    }

    setSortField(nextSortField)
    setSortDirection('asc')
  }

  const columns: DataTableColumn<OrganisationMembersTableRow, OrganisationMembersSortField>[] = [
    {
      id: 'member',
      header: 'Member',
      sortKey: 'member',
      width: showPermissionsRole || showStatus || showActions ? '34%' : '58%',
      headerClassName,
      cellClassName,
      renderCell: (row) => {
        const initials = (row.initials ?? row.displayName.charAt(0)).toUpperCase()

        return (
          <div className="flex items-center">
            <div className="h-10 w-10 flex-shrink-0">
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 text-sm font-bold text-white shadow-sm">
                {initials}
              </div>
            </div>
            <div className="ml-4">
              <div className="text-sm font-medium text-[var(--color-foreground)]">
                {row.displayName}
              </div>
              <div className="text-sm text-[var(--color-muted-foreground)]">{row.subtitle}</div>
            </div>
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Role',
      sortKey: 'role',
      sortable: hasRoleSortValues,
      width: showPermissionsRole || showStatus || showActions ? '22%' : '42%',
      headerClassName,
      cellClassName,
      renderCell: (row) => row.roleContent,
    },
    ...(showPermissionsRole
      ? [{
          id: 'permissions-role',
          header: 'Permissions Role',
          sortKey: 'permissions-role',
          sortable: hasPermissionsRoleSortValues,
          width: '22%',
          headerClassName,
          cellClassName,
          renderCell: (row: OrganisationMembersTableRow) => row.permissionsRoleContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow, OrganisationMembersSortField>]
      : []),
    ...(showStatus
      ? [{
          id: 'status',
          header: 'Status',
          sortKey: 'status',
          sortable: hasStatusSortValues,
          width: '12%',
          headerClassName,
          cellClassName,
          renderCell: (row: OrganisationMembersTableRow) => row.statusContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow, OrganisationMembersSortField>]
      : []),
    ...(showActions
      ? [{
          id: 'actions',
          header: 'Actions',
          align: 'right' as const,
          sortable: false,
          width: '10%',
          headerClassName,
          cellClassName: `${cellClassName} text-right`,
          renderCell: (row: OrganisationMembersTableRow) => row.actionsContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow, OrganisationMembersSortField>]
      : []),
  ]

  return (
    <div className={containerClassName}>
      <DataTable
        columns={columns}
        rows={sortedRows}
        getRowId={(row) => row.id}
        className="min-h-0 flex-1"
        minTableWidth={showPermissionsRole || showStatus || showActions ? 920 : 760}
        tableLayout="fixed"
        sortField={sortField}
        sortDirection={sortDirection}
        onSortChange={handleSortChange}
        tableWrapClassName="border-0 bg-white"
        tableClassName="bg-white"
      />
    </div>
  )
}
