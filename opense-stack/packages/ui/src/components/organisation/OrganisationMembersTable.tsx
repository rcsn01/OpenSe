import { type ReactNode } from 'react'

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
  return (
    <div className="overflow-hidden bg-white rounded-xl border border-slate-200 shadow-sm">
      <table className="min-w-full divide-y divide-slate-200">
        <thead className="bg-slate-50">
          <tr>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Member</th>
            <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Role</th>
            {showPermissionsRole && (
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Permissions Role</th>
            )}
            {showStatus && (
              <th className="px-6 py-4 text-left text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
            )}
            {showActions && (
              <th className="px-6 py-4 text-right text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
            )}
          </tr>
        </thead>
        <tbody className="divide-y divide-slate-200 bg-white">
          {rows.map((row) => {
            const initials = (row.initials ?? row.displayName.charAt(0)).toUpperCase()
            return (
              <tr key={row.id} className="group hover:bg-slate-50/80 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="h-10 w-10 flex-shrink-0">
                      <div className="h-10 w-10 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white text-sm font-bold shadow-sm">
                        {initials}
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className="text-sm font-medium text-slate-900 group-hover:text-indigo-600 transition-colors">
                        {row.displayName}
                      </div>
                      <div className="text-sm text-slate-500">{row.subtitle}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">{row.roleContent}</td>
                {showPermissionsRole && (
                  <td className="px-6 py-4 whitespace-nowrap">{row.permissionsRoleContent}</td>
                )}
                {showStatus && (
                  <td className="px-6 py-4 whitespace-nowrap">{row.statusContent}</td>
                )}
                {showActions && (
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">{row.actionsContent}</td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
