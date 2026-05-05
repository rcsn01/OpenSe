import { type ReactNode } from 'react'
import { DataTable, type DataTableColumn } from '../ui/DataTable'

export type OrganisationMembersTableRow = {
  id: string
  displayName: string
  subtitle: string
  initials?: string
  roleContent: ReactNode
  permissionsRoleContent?: ReactNode
  statusContent?: ReactNode
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
  containerClassName = 'overflow-hidden',
}: OrganisationMembersTableProps) {
  const bodyCellClassName = 'whitespace-nowrap'

  const columns: DataTableColumn<OrganisationMembersTableRow>[] = [
    {
      id: 'member',
      header: 'Member',
      cellClassName: bodyCellClassName,
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
      cellClassName: bodyCellClassName,
      renderCell: (row) => row.roleContent,
    },
    ...(showPermissionsRole
      ? [{
          id: 'permissions-role',
          header: 'Permissions Role',
          cellClassName: bodyCellClassName,
          renderCell: (row: OrganisationMembersTableRow) => row.permissionsRoleContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow>]
      : []),
    ...(showStatus
      ? [{
          id: 'status',
          header: 'Status',
          cellClassName: bodyCellClassName,
          renderCell: (row: OrganisationMembersTableRow) => row.statusContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow>]
      : []),
    ...(showActions
      ? [{
          id: 'actions',
          header: 'Actions',
          align: 'right' as const,
          cellClassName: `${bodyCellClassName} text-right`,
          renderCell: (row: OrganisationMembersTableRow) => row.actionsContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow>]
      : []),
  ]

  return (
    <div className={containerClassName}>
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        tableClassName="min-w-full"
      />
    </div>
  )
}
