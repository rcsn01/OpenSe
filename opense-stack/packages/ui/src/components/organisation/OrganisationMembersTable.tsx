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
}

export function OrganisationMembersTable({
  rows,
  showPermissionsRole = false,
  showStatus = false,
  showActions = false,
}: OrganisationMembersTableProps) {
  const headerCellClassName = 'bg-slate-50 !px-6 !py-4 text-left text-xs font-semibold uppercase tracking-wider !text-slate-500'
  const bodyCellClassName = '!px-6 !py-4 whitespace-nowrap'

  const columns: DataTableColumn<OrganisationMembersTableRow>[] = [
    {
      id: 'member',
      header: 'Member',
      headerClassName: headerCellClassName,
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
              <div className="text-sm font-medium text-slate-900 transition-colors group-hover:text-indigo-600">
                {row.displayName}
              </div>
              <div className="text-sm text-slate-500">{row.subtitle}</div>
            </div>
          </div>
        )
      },
    },
    {
      id: 'role',
      header: 'Role',
      headerClassName: headerCellClassName,
      cellClassName: bodyCellClassName,
      renderCell: (row) => row.roleContent,
    },
    ...(showPermissionsRole
      ? [{
          id: 'permissions-role',
          header: 'Permissions Role',
          headerClassName: headerCellClassName,
          cellClassName: bodyCellClassName,
          renderCell: (row: OrganisationMembersTableRow) => row.permissionsRoleContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow>]
      : []),
    ...(showStatus
      ? [{
          id: 'status',
          header: 'Status',
          headerClassName: headerCellClassName,
          cellClassName: bodyCellClassName,
          renderCell: (row: OrganisationMembersTableRow) => row.statusContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow>]
      : []),
    ...(showActions
      ? [{
          id: 'actions',
          header: 'Actions',
          align: 'right' as const,
          headerClassName: `${headerCellClassName} text-right`,
          cellClassName: `${bodyCellClassName} text-right text-sm font-medium`,
          renderCell: (row: OrganisationMembersTableRow) => row.actionsContent,
        } satisfies DataTableColumn<OrganisationMembersTableRow>]
      : []),
  ]

  return (
    <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
      <DataTable
        columns={columns}
        rows={rows}
        getRowId={(row) => row.id}
        tableWrapClassName="border-0 rounded-none bg-white"
        tableClassName="min-w-full bg-white"
        rowClassName="group hover:!bg-slate-50/80"
      />
    </div>
  )
}
